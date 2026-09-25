import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatBuildTime } from '../../buildInfo';
import AboutDialog from '../../about/AboutDialog';
import { latestChangelogVersion } from '../../about/changelogData';
import { hasUnreadChangelog, markChangelogSeen } from '../../about/changelogStorage';

function CharacterPanelFooter() {
  const { t } = useTranslation();
  const [showChangelog, setShowChangelog] = useState(false);
  const [unread, setUnread] = useState(() => hasUnreadChangelog(latestChangelogVersion));

  const openChangelog = () => {
    setShowChangelog(true);
    if (latestChangelogVersion) markChangelogSeen(latestChangelogVersion);
    setUnread(false);
  };

  return (
    <>
      <div className="character-panel__footer">
        <button type="button" className="character-panel__footer-build" onClick={openChangelog}>
          {__APP_VERSION__} ({formatBuildTime(__BUILD_TIME__)})
          {unread && (
            <span className="app-footer-build__dot" aria-label={t('changelog.unreadBadge')} />
          )}
        </button>
        <hr className="character-panel__footer-hr" />
        <p className="character-panel__footer-copyright">{t('footer.copyright')}</p>
        <p className="character-panel__footer-disclaimer">{t('footer.disclaimer')}</p>
      </div>
      {showChangelog && <AboutDialog onClose={() => setShowChangelog(false)} />}
    </>
  );
}

export default CharacterPanelFooter;
