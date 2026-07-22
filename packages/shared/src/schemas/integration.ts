import { z } from 'zod';

export const connectJiraSchema = z.object({
  name: z.string().min(2, 'Give this connection a name'),
  siteUrl: z.string().url('Enter your full Jira site URL, e.g. https://acme.atlassian.net'),
  email: z.string().email('Enter the email address tied to your Jira API token'),
  apiToken: z.string().min(10, 'Paste your Atlassian API token'),
});
export type ConnectJiraInput = z.infer<typeof connectJiraSchema>;

export interface IntegrationConnection {
  id: string;
  connectorKey: string;
  name: string;
  status: string;
}
