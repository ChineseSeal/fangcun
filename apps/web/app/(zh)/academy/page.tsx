import Link from "next/link";
import { Icon } from "@/components/design-system/icons";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { AcademyLessonList } from "./lesson-list";
import styles from "./academy.module.css";

export default function AcademyPage() {
  return (
    <div className="paper-page">
      <SiteHeader />
      <main className={`page-container ${styles.page}`}>
        <header>
          <p>篆刻入门 · L0</p>
          <h1>从一枚印开始，读懂方寸天地。</h1>
          <span>不用先会写篆书。每一课都从真实印面出发，用十分钟认识一个概念。</span>
        </header>
        <AcademyLessonList />
        <aside className="paper-panel">
          <Icon name="project" size={28} />
          <div><strong>课堂练习与班级合集</strong><p>三个可直接练习的模板；登录后可创建私有课堂、分享邀请码并收集学生最终稿。</p></div>
          <Link className="outline-button" href="/academy/classroom">打开课堂模式</Link>
        </aside>
        <aside className="paper-panel">
          <Icon name="grid" size={28} />
          <div><strong>我的知识地图</strong><p>把课程进度、识印小测与掌握印记连成一条学习路径。</p></div>
          <Link className="outline-button" href="/academy/map">打开知识地图</Link>
        </aside>
        <aside className="paper-panel">
          <Icon name="book" size={28} />
          <div><strong>印章小百科</strong><p>朱文、白文、汉印、古玺、章法……12 个核心词条已核验来源。</p></div>
          <Link className="outline-button" href="/academy/wiki">打开百科</Link>
        </aside>
        <aside className="paper-panel">
          <Icon name="search" size={28} />
          <div><strong>识印入门小测</strong><p>5 枚 Engine 教学印蜕，约 2 分钟；逐题服务端判题，答完立即看解析。</p></div>
          <Link className="outline-button" href="/academy/quiz/intro">开始小测</Link>
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}
