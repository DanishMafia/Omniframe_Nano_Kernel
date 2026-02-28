import { useState, useCallback, useEffect } from 'react';
import type { AppView, ParsedDocument } from './types';
import { useHardwareProfile } from './ui/hooks/useHardwareProfile';
import { useInference } from './ui/hooks/useInference';
import { useConstitution } from './ui/hooks/useConstitution';
import { useSpeculativeDecoding } from './ui/hooks/useSpeculativeDecoding';
import { parseFile, recommendModel } from './engine';
import { deleteDocument, loadDocuments } from './storage/opfs-store';

import { Sidebar } from './ui/components/Sidebar';
import { ChatView } from './ui/components/ChatView';
import { HardwareView } from './ui/components/HardwareView';
import { ConstitutionView } from './ui/components/ConstitutionView';
import { TasksView } from './ui/components/TasksView';
import { FilesView } from './ui/components/FilesView';
import { SettingsView } from './ui/components/SettingsView';

function App() {
  const [view, setView] = useState<AppView>('chat');
  const [documents, setDocuments] = useState<ParsedDocument[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const hardware = useHardwareProfile();
  const inference = useInference();
  const constitution = useConstitution();
  const speculative = useSpeculativeDecoding();

  const recommendedModelId = hardware.profile ? recommendModel(hardware.profile) : null;

  // Load persisted documents on mount
  useEffect(() => {
    loadDocuments().then((docs) => {
      if (docs.length > 0) setDocuments(docs as ParsedDocument[]);
    });
  }, []);

  const handleParseFile = useCallback(async (file: File) => {
    const doc = await parseFile(file);
    setDocuments((prev) => {
      const filtered = prev.filter((d) => d.name !== doc.name);
      return [...filtered, doc];
    });
  }, []);

  const handleRemoveDocument = useCallback(async (name: string) => {
    await deleteDocument(name);
    setDocuments((prev) => prev.filter((d) => d.name !== name));
  }, []);

  const renderView = () => {
    switch (view) {
      case 'chat':
        return (
          <ChatView
            messages={inference.messages}
            streamingContent={inference.streamingContent}
            progress={inference.progress}
            documents={documents}
            onSendMessage={inference.sendMessage}
            onClearChat={inference.clearChat}
          />
        );
      case 'hardware':
        return (
          <HardwareView
            profile={hardware.profile}
            loading={hardware.loading}
            error={hardware.error}
          />
        );
      case 'constitution':
        return (
          <ConstitutionView
            constitution={constitution.constitution}
            compiledPrompt={constitution.compiledPrompt}
            onAddRule={constitution.addRule}
            onUpdateRule={constitution.updateRule}
            onRemoveRule={constitution.removeRule}
            onToggleRule={constitution.toggleRule}
            loading={constitution.loading}
          />
        );
      case 'tasks':
        return <TasksView />;
      case 'files':
        return (
          <FilesView
            documents={documents}
            onParseFile={handleParseFile}
            onRemoveDocument={handleRemoveDocument}
          />
        );
      case 'settings':
        return (
          <SettingsView
            progress={inference.progress}
            onLoadModel={inference.loadModel}
            specState={speculative.state}
            onLoadSpecModels={speculative.loadModels}
            recommendedModelId={recommendedModelId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0f]">
      <Sidebar
        currentView={view}
        onNavigate={setView}
        modelStatus={inference.progress.status}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />
      <main className="flex-1 min-w-0 overflow-hidden">
        {renderView()}
      </main>
    </div>
  );
}

export default App;
