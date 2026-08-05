import { GenerateAutomationHandler } from './generate-automation.command';
import { SaveAutomationHandler } from './save-automation.command';
import { MarkAutomationOutdatedHandler } from './mark-automation-outdated.command';

export * from './generate-automation.command';
export * from './save-automation.command';
export * from './mark-automation-outdated.command';

export const AUTOMATION_COMMAND_HANDLERS = [GenerateAutomationHandler, SaveAutomationHandler, MarkAutomationOutdatedHandler];
