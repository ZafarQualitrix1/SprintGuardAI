'use client';

import { useRef } from 'react';
import { Download, Upload } from 'lucide-react';
import type { OrganizationSettingsBackup } from '@sprintguard/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useExportOrganizationSettings, useImportOrganizationSettings } from '@/features/organization/api';

export function BackupPanel() {
  const exportSettings = useExportOrganizationSettings();
  const importSettings = useImportOrganizationSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () =>
    exportSettings.mutate(undefined, {
      onSuccess: (backup) => {
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `organization-settings-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Could not export settings',
          description: error instanceof ApiError ? error.message : 'Something went wrong.',
        }),
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const backup = JSON.parse(text) as OrganizationSettingsBackup;
      importSettings.mutate(backup, {
        onSuccess: () => toast({ title: 'Settings restored from backup' }),
        onError: (error) =>
          toast({
            variant: 'destructive',
            title: 'Could not restore backup',
            description: error instanceof ApiError ? error.message : 'Something went wrong.',
          }),
      });
    } catch {
      toast({ variant: 'destructive', title: 'Invalid backup file', description: 'Could not parse this JSON file.' });
    } finally {
      e.target.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Backup & Restore</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Exports the Organization Settings configuration on this page as a JSON file -- not a full data export of
          sprints, stories, or test cases.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exportSettings.isPending}>
            <Download className="mr-1.5 h-4 w-4" /> {exportSettings.isPending ? 'Exporting…' : 'Export settings'}
          </Button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileChange} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importSettings.isPending}>
            <Upload className="mr-1.5 h-4 w-4" /> {importSettings.isPending ? 'Restoring…' : 'Import settings'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Every restore is recorded in Admin Console&apos;s Audit Logs.
        </p>
      </CardContent>
    </Card>
  );
}
