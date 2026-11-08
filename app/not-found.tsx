import { HomeLayout } from 'fumadocs-ui/layouts/home';
import Link from 'next/link';
import { baseOptions } from '@/lib/layout.shared';

export default function NotFound() {
  return (
    <HomeLayout {...baseOptions()}>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">There&apos;s no page here</h1>
        <p className="text-fd-muted-foreground">
          It may have moved, or not exist in this version.{' '}
          <Link href="/" className="underline">
            Start from the home page
          </Link>
          , or search.
        </p>
      </main>
    </HomeLayout>
  );
}
