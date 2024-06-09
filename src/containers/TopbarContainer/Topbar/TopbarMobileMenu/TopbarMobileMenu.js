/**
 *  TopbarMobileMenu prints the menu content for authenticated user or
 * shows login actions for those who are not authenticated.
 */
import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { ACCOUNT_SETTINGS_PAGES } from '../../../../routing/routeConfiguration';
// import { FormattedMessage } from '../../../../util/reactIntl';
import { propTypes } from '../../../../util/types';
// import { ensureCurrentUser } from '../../../../util/data';

import { ExternalLink, NamedLink } from '../../../../components';

import css from './TopbarMobileMenu.module.css';

const CustomLinkComponent = ({ linkConfig, currentPage }) => {
  const { group, text, type, href, route } = linkConfig;
  const getCurrentPageClass = page => {
    const hasPageName = name => currentPage?.indexOf(name) === 0;
    const isCMSPage = pageId => hasPageName('CMSPage') && currentPage === `${page}:${pageId}`;
    const isInboxPage = tab => hasPageName('InboxPage') && currentPage === `${page}:${tab}`;
    const isCurrentPage = currentPage === page;

    return isCMSPage(route?.params?.pageId) || isInboxPage(route?.params?.tab) || isCurrentPage
      ? css.currentPage
      : null;
  };

  // Note: if the config contains 'route' keyword,
  // then in-app linking config has been resolved already.
  if (type === 'internal' && route) {
    // Internal link
    const { name, params, to } = route || {};
    const className = classNames(css.navigationLink, getCurrentPageClass(name));
    return (
      <NamedLink name={name} params={params} to={to} className={className}>
        <span className={css.menuItemBorder} />
        {text}
      </NamedLink>
    );
  }
  return (
    <ExternalLink href={href} className={css.navigationLink}>
      <span className={css.menuItemBorder} />
      {text}
    </ExternalLink>
  );
};

const CategoryLinkComponent = ({ categories, currentPage }) => {
  const { name, id } = categories;
  const searchLink = `/s?pub_categoryLevel1=${id}`;

  return (
    <a href={searchLink} className={css.navigationLink}>
      <span className={css.menuItemBorder} />
      {name}
    </a>
  );
};

const TopbarMobileMenu = props => {
  const { currentPage, currentUserHasListings, currentUser, customLinks, categories } = props;

  const extraLinks = customLinks.map(linkConfig => {
    return (
      <CustomLinkComponent
        key={linkConfig.text}
        linkConfig={linkConfig}
        currentPage={currentPage}
      />
    );
  });

  const listingCategories = categories.map(category => {
    return (
      <CategoryLinkComponent key={category.id} categories={category} currentPage={currentPage} />
    );
  });

  const currentPageClass = page => {
    const isAccountSettingsPage =
      page === 'AccountSettingsPage' && ACCOUNT_SETTINGS_PAGES.includes(currentPage);
    const isInboxPage = currentPage?.indexOf('InboxPage') === 0 && page?.indexOf('InboxPage') === 0;
    return currentPage === page || isAccountSettingsPage || isInboxPage ? css.currentPage : null;
  };

  return (
    <div className={css.root}>
      <div className={css.content}>
        <div className={css.customLinksWrapper}>{extraLinks}</div>
        <div className={css.categoryLinksWrapper}>{listingCategories}</div>
        <div className={css.spacer} />
      </div>
      {/* <div className={css.footer}>
        <NamedLink className={css.createNewListingLink} name="NewListingPage">
          <FormattedMessage id="TopbarMobileMenu.newListingLink" />
        </NamedLink>
      </div> */}
    </div>
  );
};

TopbarMobileMenu.defaultProps = { currentUser: null, notificationCount: 0, currentPage: null };

const { bool, func, number, string } = PropTypes;

TopbarMobileMenu.propTypes = {
  isAuthenticated: bool.isRequired,
  currentUserHasListings: bool.isRequired,
  currentUser: propTypes.currentUser,
  currentPage: string,
  notificationCount: number,
  onLogout: func.isRequired,
};

export default TopbarMobileMenu;
