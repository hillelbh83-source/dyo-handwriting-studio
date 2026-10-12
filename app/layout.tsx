import type { Metadata } from 'next';
export const metadata: Metadata={title:'דיו — סטודיו לכתב היד שלך',description:'כתב היד שלך, מסונכרן בין המכשירים'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="he" dir="rtl"><body>{children}</body></html>}
