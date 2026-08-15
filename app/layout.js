import './globals.css';
import './admin.css';
import './vip5.css';
import './watch.css';

export const metadata = {
  title: 'AVDB · VIP5 Movie Library',
  description: 'AVDB movie library powered by the Supabase VIP5 catalog.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
