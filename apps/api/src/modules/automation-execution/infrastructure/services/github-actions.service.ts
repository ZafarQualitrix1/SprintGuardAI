import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const WORKFLOW_FILE = 'automation-execution.yml';
const API_VERSION = '2022-11-28';

interface FetchResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

// Playwright Integration (§10): the API runs on Vercel serverless, which cannot host a long-lived
// browser process, so "running automation" means dispatching this repo's own
// .github/workflows/automation-execution.yml via workflow_dispatch -- the same "GitHub Actions as
// automation backbone" pattern already proven by deploy-uat.yml/db-migrate.yml/
// integration-health-check.yml. The workflow itself does the actual `npx playwright test` run and
// POSTs results back to /internal/automation-execution/:runId/callback.
@Injectable()
export class GithubActionsService {
  constructor(private readonly configService: ConfigService) {}

  private get token(): string {
    const token = this.configService.get<string>('githubActions.token');
    if (!token) {
      throw new InternalServerErrorException(
        'GITHUB_ACTIONS_TOKEN is not configured on this deployment -- Automation Execution cannot run without it.',
      );
    }
    return token;
  }

  private get repo(): string {
    const repo = this.configService.get<string>('githubActions.repo');
    if (!repo) {
      throw new InternalServerErrorException(
        'GITHUB_ACTIONS_REPO is not configured on this deployment -- Automation Execution cannot run without it.',
      );
    }
    return repo;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': API_VERSION,
      'Content-Type': 'application/json',
    };
  }

  // `inputs.runId` becomes the workflow's `run-name: sprintguard-${{ inputs.runId }}` (see the
  // workflow YAML), which is how the workflow correlates itself back to this SprintGuard run when
  // it POSTs its callback -- no separate "find the run I just dispatched" polling step needed.
  async dispatchWorkflow(inputs: Record<string, string>, ref = 'uat'): Promise<void> {
    const response = (await fetch(
      `https://api.github.com/repos/${this.repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      { method: 'POST', headers: this.headers(), body: JSON.stringify({ ref, inputs }) },
    )) as unknown as FetchResponse;

    if (!response.ok) {
      const body = await response.text();
      throw new InternalServerErrorException(
        `GitHub workflow dispatch failed (HTTP ${response.status}): ${body}`,
      );
    }
  }
}
