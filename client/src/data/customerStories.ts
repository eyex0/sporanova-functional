export type CustomerStory = {
  slug: string;
  eyebrow: string;
  company: string;
  headline: string;
  detail: string;
  focus: string[];
  journey: { step: string; body: string }[];
};

export const customerStories: CustomerStory[] = [];

export function getCustomerStory(slug?: string): CustomerStory | undefined {
  if (!slug) return undefined;
  return customerStories.find((story) => story.slug === slug);
}
