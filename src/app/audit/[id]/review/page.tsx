import React from 'react';
import { notFound } from 'next/navigation';
import { auditService } from '../../../../services/audit.service';
import { AuditReviewClient } from './AuditReviewClient';

export const dynamic = 'force-dynamic';

interface AuditReviewPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AuditReviewPage({ params }: AuditReviewPageProps) {
  const { id } = await params;

  let session;
  try {
    session = await auditService.getAuditSessionDetail(id);
  } catch (err) {
    notFound();
  }

  if (!session) {
    notFound();
  }

  return <AuditReviewClient initialSession={session} />;
}
