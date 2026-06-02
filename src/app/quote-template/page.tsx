import QuoteTemplate from '@/pages/QuoteTemplate'
import React from 'react'
import { Layout } from '@/components/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function quoteTemplatePage() {
    return (
        <ProtectedRoute>
            <Layout>
                <QuoteTemplate />
            </Layout>
        </ProtectedRoute>
    );
}
