import type { Metadata } from 'next';
import '@fontsource-variable/noto-sans-arabic';
import './globals.css';

export const metadata: Metadata = {
  title: 'توظيف أم تسريح؟ — مقابلة عمل لأغراضك',
  description: 'رفوفك تعلن عن وظائف، وأغراضك تحتاج إلى سيرة ذاتية. طريقة مرحة لتقرر ما تحتفظ به أو تصلحه أو تتبرّع به أو تبيعه.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
