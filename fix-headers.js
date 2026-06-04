const fs = require('fs');
const path = require('path');

const pages = [
  { p: 'src/app/(app)/investments/page.tsx', title: 'Investments', sub: 'Track your portfolio and assets', icon: 'https://img.icons8.com/ios/50/line-chart.png' },
  { p: 'src/app/(app)/liabilities/page.tsx', title: 'Liabilities', sub: 'Manage your loans and debt', icon: 'https://img.icons8.com/ios/50/bank-cards.png' },
  { p: 'src/app/(app)/goals/page.tsx', title: 'Financial Goals', sub: 'Track your savings targets', icon: 'https://img.icons8.com/ios/50/target.png' },
  { p: 'src/app/(app)/settings/page.tsx', title: 'Settings', sub: 'Manage your profile and preferences', icon: 'https://img.icons8.com/ios/50/settings.png' },
  { p: 'src/app/(app)/vault/page.tsx', title: 'Smart Vault', sub: 'Secure document storage', icon: 'https://img.icons8.com/ios/50/safe.png' }
];

pages.forEach(({p, title, sub, icon}) => {
  if (!fs.existsSync(p)) return;
  let content = fs.readFileSync(p, 'utf8');
  
  // if it already uses TopHeader, skip
  if (content.includes('TopHeader')) return;
  
  // Try to find the common heading block to replace
  // Most pages have a block like:
  /*
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">TITLE</h1>
          <p className="text-muted-foreground text-sm mt-1">SUB</p>
        </div>
        <Button...>
      </div>
  */
  
  // We can inject TopHeader at the top of imports
  content = content.replace('import { useState', 'import { TopHeader } from "@/components/shared/TopHeader"\nimport { useState');
  
  // Very hacky replacement: let's replace <div className="flex items-center justify-between">...</div> with TopHeader.
  // Actually, I'll just skip script-based replace and do it manually if needed, or leave it as is.
});
console.log("Script written, but doing it manually is safer.");
