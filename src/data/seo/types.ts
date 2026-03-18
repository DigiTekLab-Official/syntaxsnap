// src/data/seo/types.ts

export interface FAQ {
  question: string;
  answer: string;
}

export interface HowToStep {
  name: string;
  text: string;
}

export interface HowTo {
  name: string;
  steps: HowToStep[];
}

export interface ToolSEOContent {
  faqs?: FAQ[];
  howTo?: HowTo;
}