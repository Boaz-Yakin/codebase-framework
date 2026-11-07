import React from 'react';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { auditService } from '../../../services/audit.service';
import { targetService } from '../../../services/target.service';
import { AuditMainView } from '../../../components/features/AuditMainView';

export const dynamic = 'force-dynamic';

interface AuditRunnerPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AuditRunnerPage({ params }: AuditRunnerPageProps) {
  const { id } = await params;

  let session;
  let masterCatalog = [];
  try {
    [session, masterCatalog] = await Promise.all([
      auditService.getAuditSessionDetail(id),
      targetService.getMasterCatalogItems(),
    ]);
  } catch {
    notFound();
  }

  if (!session) {
    notFound();
  }

  if (session.status === 'submitted') {
    redirect(`/audit/${id}/review`);
  }

  return (
    <main className="w-full min-h-screen bg-gray-100 flex flex-col">
      {/* Global Sub-Header */}
      <header className="h-12 bg-gray-900 text-white px-4 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <Link href="/" className="font-bold text-amber-400 text-sm hover:underline">
            Store-Inv
          </Link>
          <span className="text-gray-500 text-xs">|</span>
          <span className="text-xs font-semibold truncate max-w-[200px] md:max-w-md">
            {session.store?.name}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-[11px] text-gray-400 font-mono">
            Carried PAR Items: {session.items.length} / {masterCatalog.length} Catalog
          </span>
          <Link
            href="/"
            className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs font-bold text-white"
          >
            🏠 Home
          </Link>
        </div>
      </header>

      {/* Phone / Tablet Adaptive Responsive Audit View */}
      <AuditMainView initialSession={session} masterCatalog={masterCatalog} />
    </main>
  );
}
