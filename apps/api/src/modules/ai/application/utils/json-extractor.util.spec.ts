import { extractJson } from './json-extractor.util';

describe('extractJson', () => {
  it('parses raw JSON directly', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('recovers JSON wrapped in a ```json fence', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('recovers JSON wrapped in a bare ``` fence', () => {
    expect(extractJson('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('recovers JSON with leading/trailing prose via brace-substring fallback', () => {
    expect(extractJson('Sure, here is the JSON:\n{"a":1}\nHope that helps!')).toEqual({ a: 1 });
  });

  it('throws when no JSON object can be found', () => {
    expect(() => extractJson('no json here')).toThrow(/No JSON object found/);
  });
});
