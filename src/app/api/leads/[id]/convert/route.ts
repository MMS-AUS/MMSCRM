import { NextRequest, NextResponse } from 'next/server';
import { convertLeadToProjectAction } from '../../../../../actions/convertLeadToProject';

/**
 * Next.js Route Handler: POST /api/leads/[id]/convert
 * Converts a lead to a project, enforcing street address extraction.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Lead ID is required' }, { status: 400 });
    }

    const result = await convertLeadToProjectAction(id);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to convert lead to project' },
      { status: 500 }
    );
  }
}
