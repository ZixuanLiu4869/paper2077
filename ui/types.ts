export type Format = 'newspaper' | 'encyclopedia' | 'museum' | 'documentary';
export type Story = { format: Format; headline: string; deck: string; sections: { heading: string; text: string }[]; quote: string; timeline: { year: number; event: string }[] };
export type Archive = { id: string; title: string; createdAt: string; story: Story; example?: boolean; sourceURL?: string; sourceYear?: number };
