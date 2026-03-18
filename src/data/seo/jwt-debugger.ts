// src/data/seo/jwt-debugger.ts
import type { ToolSEOContent } from './types';

export const jwtDebuggerSeo: ToolSEOContent = {
  faqs: [
    {
      question: "Is my data safe?",
      answer: "Yes. SyntaxSnap uses the browser's native atob() API. No data is sent to a server, making it safer than tools like jwt.io for production tokens."
    },
    {
      question: "Why is a local JWT debugger safer than online decoders?",
      answer: "Most online debuggers upload your token to their servers. SyntaxSnap uses the browser's native atob API to decode tokens locally, ensuring your production JWTs and sensitive claims are never exposed."
    },
    {
      question: "Does this tool detect alg:none vulnerabilities?",
      answer: "Yes. Our debugger checks for common security pitfalls like the alg:none attack and analyzes Expiration (exp) and Not Before (nbf) claims to help you debug authentication flows."
    },
    {
      question: "Can I decode expired tokens?",
      answer: "Yes. The debugger decodes any structurally valid JWT regardless of expiration. It also highlights expired and not-yet-valid tokens so you can inspect claims for debugging purposes."
    }
  ],
  howTo: {
    name: "How to decode and debug a JWT locally",
    steps: [
      {
        name: "Paste your JWT",
        text: "Copy your JSON Web Token (JWT) and paste it into the encoded token input area."
      },
      {
        name: "Inspect Header & Payload",
        text: "The tool instantly decodes the Base64Url string in real-time, revealing the signing algorithm, user claims, and timestamp data."
      },
      {
        name: "Review Security Analysis",
        text: "Check the built-in security panel to see if the token is expired, not yet valid, or vulnerable to 'alg: none' attacks."
      }
    ]
  }
};