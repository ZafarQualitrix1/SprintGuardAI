import { renderTemplate } from './prompt-template.util';

describe('renderTemplate', () => {
  it('substitutes known variables', () => {
    expect(renderTemplate('Hello {{name}}, you are {{age}}.', { name: 'Ada', age: 30 })).toBe(
      'Hello Ada, you are 30.',
    );
  });

  it('leaves unknown placeholders untouched', () => {
    expect(renderTemplate('Hello {{name}}', {})).toBe('Hello {{name}}');
  });

  it('renders null/undefined variables as empty string', () => {
    expect(renderTemplate('Value: [{{missing}}]', { missing: null })).toBe('Value: []');
  });

  it('substitutes the same placeholder multiple times', () => {
    expect(renderTemplate('{{x}}-{{x}}', { x: 'A' })).toBe('A-A');
  });
});
