Company Q&A: ask anything about a company, get answers only from its data.

Enter a company domain (for example, retool.com). The app pulls the company's profile from the Crustdata Company Enrich API and shows a summary card. Ask questions in the chat and each answer lists the field it came from ("Based on"). If the data doesn't contain the answer, the app says so instead of guessing.

Built with: Next.js, Tailwind CSS (UI from v0), TypeScript, Crustdata API.

Repo: https://github.com/AndyChaudhary/company-qa
Demo: https://drive.google.com/file/d/1U2KEsgKx60uuO1kZtj-PiD73DGDkaUSh/view?usp=drivesdk

Setup: clone the repo, run pnpm install, add CRUSTDATA_API_KEY to a local .env file, then run pnpm dev.

Andy Chaudhary, solo entry, Homingo Hack Days x Crustdata.

- Leadership details such as the CEO are not in the Crustdata Company Enrich data, so the app says "not in the data" for those questions.
