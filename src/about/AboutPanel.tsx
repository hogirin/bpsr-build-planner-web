import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatBuildTime } from '../buildInfo';
import { openExternal } from '../platform/openExternal';
import ChangelogList from './ChangelogList';
import './about-panel.css';

const GITHUB_URL = 'https://github.com/alalwww/bpsr-build-planner';
const appIconUrl = `${import.meta.env.BASE_URL}ogp.png`;

interface AboutPanelProps {
  /** ヘッダー右上に表示する追加UI(クライアント版の更新確認ボタン等)。 */
  updateArea?: ReactNode;
  onOk: () => void;
}

// Web版のアプリ情報と変更履歴。
function AboutPanel({ updateArea, onOk }: AboutPanelProps) {
  const { t } = useTranslation();

  return (
    <>
      <header className="about-panel__header">
        <img src={appIconUrl} alt="BPSR Build Planner" className="about-panel__logo" />
        {updateArea && <div className="about-panel__update">{updateArea}</div>}
        <h1 className="about-panel__name">BPSR Build Planner</h1>
        <div className="about-panel__copyright">{t('footer.copyright')}</div>
        <dl>
          <div>
            <dt>Version</dt>
            <dd>
              {__APP_VERSION__} ({formatBuildTime(__BUILD_TIME__)})
            </dd>
          </div>
          <div>
            <dt>Author</dt>
            <dd>alalwww</dd>
          </div>
          <div>
            <dt>License</dt>
            <dd>MIT</dd>
          </div>
        </dl>
        <p className="about-panel__disclaimer">{t('footer.disclaimer')}</p>
        <div className="about-panel__links">
          <div>
            <button type="button" onClick={() => openExternal(GITHUB_URL)}>
              {t('about.github')}
            </button>
          </div>
          <div>
            <button type="button" className="about-panel__ok" onClick={onOk}>
              {t('about.ok')}
            </button>
          </div>
        </div>
      </header>
      <h2 className="about-panel__section-title">{t('changelog.title')}</h2>
      <div className="about-panel__changelog">
        <ChangelogList />
      </div>
    </>
  );
}

export default AboutPanel;
