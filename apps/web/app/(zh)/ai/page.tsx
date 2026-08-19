import { SiteHeader } from "@/components/design-system/site-header";
import { isOpenAiProviderConfigured } from "@/lib/openai-ai-provider";
import { AiDesigner } from "./ai-designer";
import styles from "./ai.module.css";

export default function AiSealPage() {
  return (
    <div className="paper-page">
      <SiteHeader />
      <main className={`page-container ${styles.page}`}>
        <header className={styles.heading}>
          <div>
            <span>INTENT → SEAL DSL</span>
            <h1>AI 篆刻师</h1>
          </div>
          <p>描述印文、用途与气质。建议会先变成可检查的参数，由你确认后再进入工作台。</p>
        </header>
        <AiDesigner providerConfigured={isOpenAiProviderConfigured()} />
      </main>
    </div>
  );
}
