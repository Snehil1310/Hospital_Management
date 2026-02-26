import './globals.css';

export const metadata = {
    title: 'Smart Hospital ERP',
    description: 'Smart Hospital Operations & Facility ERP System',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body>{children}</body>
        </html>
    );
}
