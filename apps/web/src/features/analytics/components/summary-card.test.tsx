import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Rocket } from 'lucide-react';
import { SummaryCard } from './summary-card';

describe('SummaryCard', () => {
  it('renders the label and value when not loading', () => {
    render(<SummaryCard label="Active Sprints" value="3" icon={Rocket} />);

    expect(screen.getByText('Active Sprints')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders a skeleton instead of the value while loading', () => {
    render(<SummaryCard label="Active Sprints" value="3" icon={Rocket} isLoading />);

    expect(screen.getByText('Active Sprints')).toBeInTheDocument();
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });

  it('renders an optional hint when provided', () => {
    render(<SummaryCard label="Coverage" value="82%" icon={Rocket} hint="Up 4% this sprint" />);

    expect(screen.getByText('Up 4% this sprint')).toBeInTheDocument();
  });
});
