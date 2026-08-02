'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PromptEditor } from './prompt-editor';
import { VersionHistory } from './version-history';
import { VersionCompare } from './version-compare';

interface PromptDetailProps {
  capability: string;
  initialVersion: string;
  onBack: () => void;
}

export function PromptDetail({ capability, initialVersion, onBack }: PromptDetailProps) {
  const [version, setVersion] = useState(initialVersion);
  const [tab, setTab] = useState('editor');

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to library
      </Button>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="history">Version History</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="mt-4">
          <PromptEditor
            capability={capability}
            version={version}
            onVersionChange={setVersion}
            onViewHistory={() => setTab('history')}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <VersionHistory
            capability={capability}
            selectedVersion={version}
            onSelectVersion={(v) => {
              setVersion(v);
              setTab('editor');
            }}
          />
        </TabsContent>

        <TabsContent value="compare" className="mt-4">
          <VersionCompare capability={capability} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
