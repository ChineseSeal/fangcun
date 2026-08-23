import Link from "next/link";

type SectionPlaceholderProps = {
  title: string;
  description: string;
  milestone: string;
};

export function SectionPlaceholder({
  title,
  description,
  milestone,
}: SectionPlaceholderProps) {
  return (
    <main className="placeholder-page">
      <div className="placeholder-topbar">
        <Link className="wordmark" href="/">
          方寸
        </Link>
        <span>{milestone}</span>
      </div>
      <section>
        <p>路线已建立</p>
        <h1>{title}</h1>
        <div className="placeholder-rule" />
        <p className="placeholder-description">{description}</p>
        <Link className="text-link" href="/">
          返回首页
        </Link>
      </section>
    </main>
  );
}
