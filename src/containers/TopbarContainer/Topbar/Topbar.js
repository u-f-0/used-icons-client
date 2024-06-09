import React, { useState, useEffect, Component } from 'react';
import { array, arrayOf, bool, func, number, object, shape, string } from 'prop-types';
import pickBy from 'lodash/pickBy';
import classNames from 'classnames';

import appSettings from '../../../config/settings';
import { useConfiguration } from '../../../context/configurationContext';
import { useRouteConfiguration } from '../../../context/routeConfigurationContext';
import { ACCOUNT_SETTINGS_PAGES } from '../../../routing/routeConfiguration';
import { FormattedMessage, intlShape, useIntl } from '../../../util/reactIntl';
import { isMainSearchTypeKeywords, isOriginInUse } from '../../../util/search';
import { parse, stringify } from '../../../util/urlHelpers';
import loginIcon from '../../../assets/login.svg'; // Adjust the path to your SVG icon
import { createResourceLocatorString, matchPathname, pathByRouteName } from '../../../util/routes';
import { propTypes } from '../../../util/types';
import {
  Button,
  LimitedAccessBanner,
  LinkedLogo,
  NamedLink,
  Menu,
  MenuLabel,
  MenuContent,
  MenuItem,
  ProfileMenu,
  InlineTextButton,
  NotificationBadge,
  Avatar,
  Modal,
  ModalMissingInformation,
} from '../../../components';

import MenuIcon from './MenuIcon';
import SearchIcon from './SearchIcon';
import TopbarSearchForm from './TopbarSearchForm/TopbarSearchForm';
import TopbarMobileMenu from './TopbarMobileMenu/TopbarMobileMenu';
import TopbarDesktop from './TopbarDesktop/TopbarDesktop';

import css from './Topbar.module.css';
import cssDesktop from './TopbarDesktop/TopbarDesktop.module.css';

const redirectToURLWithModalState = (props, modalStateParam) => {
  const { history, location } = props;
  const { pathname, search, state } = location;
  const searchString = `?${stringify({ [modalStateParam]: 'open', ...parse(search) })}`;
  history.push(`${pathname}${searchString}`, state);
};

const redirectToURLWithoutModalState = (props, modalStateParam) => {
  const { history, location } = props;
  const { pathname, search, state } = location;
  const queryParams = pickBy(parse(search), (v, k) => {
    return k !== modalStateParam;
  });
  const stringified = stringify(queryParams);
  const searchString = stringified ? `?${stringified}` : '';
  history.push(`${pathname}${searchString}`, state);
};

const isPrimary = o => o.group === 'primary';
const isSecondary = o => o.group === 'secondary';
const compareGroups = (a, b) => {
  const isAHigherGroupThanB = isPrimary(a) && isSecondary(b);
  const isALesserGroupThanB = isSecondary(a) && isPrimary(b);
  // Note: sort order is stable in JS
  return isAHigherGroupThanB ? -1 : isALesserGroupThanB ? 1 : 0;
};
// Returns links in order where primary links are returned first
const sortCustomLinks = customLinks => {
  const links = Array.isArray(customLinks) ? customLinks : [];
  return links.sort(compareGroups);
};

// Resolves in-app links against route configuration
const getResolvedCustomLinks = (customLinks, routeConfiguration) => {
  const links = Array.isArray(customLinks) ? customLinks : [];
  return links.map(linkConfig => {
    const { type, href } = linkConfig;
    const isInternalLink = type === 'internal' || href.charAt(0) === '/';
    if (isInternalLink) {
      // Internal link
      const testURL = new URL('http://my.marketplace.com' + href);
      const matchedRoutes = matchPathname(testURL.pathname, routeConfiguration);
      if (matchedRoutes.length > 0) {
        const found = matchedRoutes[0];
        const to = { search: testURL.search, hash: testURL.hash };
        return {
          ...linkConfig,
          route: {
            name: found.route?.name,
            params: found.params,
            to,
          },
        };
      }
    }
    return linkConfig;
  });
};

const isCMSPage = found =>
  found.route?.name === 'CMSPage' ? `CMSPage:${found.params?.pageId}` : null;
const isInboxPage = found =>
  found.route?.name === 'InboxPage' ? `InboxPage:${found.params?.tab}` : null;
const isLandingPage = found => (found.route?.name === 'LandingPage' ? 'LandingPage' : null);

// Find the name of the current route/pathname.
// It's used as handle for currentPage check.
const getResolvedCurrentPage = (location, routeConfiguration) => {
  const matchedRoutes = matchPathname(location.pathname, routeConfiguration);
  if (matchedRoutes.length > 0) {
    const found = matchedRoutes[0];
    const cmsPageName = isCMSPage(found);
    const inboxPageName = isInboxPage(found);
    const landingPageName = isLandingPage(found);
    return cmsPageName
      ? cmsPageName
      : inboxPageName
      ? inboxPageName
      : landingPageName
      ? landingPageName
      : `${found.route?.name}`;
  }
};

const GenericError = props => {
  const { show } = props;
  const classes = classNames(css.genericError, {
    [css.genericErrorVisible]: show,
  });
  return (
    <div className={classes}>
      <div className={css.genericErrorContent}>
        <p className={css.genericErrorText}>
          <FormattedMessage id="Topbar.genericError" />
        </p>
      </div>
    </div>
  );
};

GenericError.propTypes = {
  show: bool.isRequired,
};

class TopbarComponent extends Component {
  constructor(props) {
    super(props);
    this.handleMobileMenuOpen = this.handleMobileMenuOpen.bind(this);
    this.handleMobileMenuClose = this.handleMobileMenuClose.bind(this);
    this.handleMobileSearchOpen = this.handleMobileSearchOpen.bind(this);
    this.handleMobileSearchClose = this.handleMobileSearchClose.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleLogout = this.handleLogout.bind(this);
  }

  handleMobileMenuOpen() {
    redirectToURLWithModalState(this.props, 'mobilemenu');
  }

  handleMobileMenuClose() {
    redirectToURLWithoutModalState(this.props, 'mobilemenu');
  }

  handleMobileSearchOpen() {
    redirectToURLWithModalState(this.props, 'mobilesearch');
  }

  handleMobileSearchClose() {
    redirectToURLWithoutModalState(this.props, 'mobilesearch');
  }

  handleSubmit(values) {
    const { currentSearchParams } = this.props;
    const { history, config, routeConfiguration } = this.props;

    const topbarSearchParams = () => {
      if (isMainSearchTypeKeywords(config)) {
        return { keywords: values?.keywords };
      }
      // topbar search defaults to 'location' search
      const { search, selectedPlace } = values?.location;
      const { origin, bounds } = selectedPlace;
      const originMaybe = isOriginInUse(config) ? { origin } : {};

      return {
        ...originMaybe,
        address: search,
        bounds,
      };
    };
    const searchParams = {
      ...currentSearchParams,
      ...topbarSearchParams(),
    };
    history.push(createResourceLocatorString('SearchPage', routeConfiguration, {}, searchParams));
  }

  handleLogout() {
    const { onLogout, history, routeConfiguration } = this.props;
    onLogout().then(() => {
      const path = pathByRouteName('LandingPage', routeConfiguration);

      // In production we ensure that data is really lost,
      // but in development mode we use stored values for debugging
      if (appSettings.dev) {
        history.push(path);
      } else if (typeof window !== 'undefined') {
        window.location = path;
      }

      console.log('logged out'); // eslint-disable-line
    });
  }

  render() {
    const {
      className,
      rootClassName,
      desktopClassName,
      mobileRootClassName,
      mobileClassName,
      isAuthenticated,
      isLoggedInAs,
      authScopes,
      authInProgress,
      currentUser,
      currentUserHasListings,
      currentUserHasOrders,
      currentPage,
      notificationCount,
      intl,
      location,
      onManageDisableScrolling,
      onResendVerificationEmail,
      sendVerificationEmailInProgress,
      sendVerificationEmailError,
      showGenericError,
      config,
      routeConfiguration,
    } = this.props;

    const { mobilemenu, mobilesearch, keywords, address, origin, bounds } = parse(location.search, {
      latlng: ['origin'],
      latlngBounds: ['bounds'],
    });

    // Custom links are sorted so that group="primary" are always at the beginning of the list.
    const sortedCustomLinks = sortCustomLinks(config.topbar?.customLinks);
    const customLinks = getResolvedCustomLinks(sortedCustomLinks, routeConfiguration);
    const categories = config.categoryConfiguration?.categories;
    const resolvedCurrentPage = currentPage || getResolvedCurrentPage(location, routeConfiguration);
    const notificationDot = notificationCount > 0 ? <div className={css.notificationDot} /> : null;

    const isMobileMenuOpen = mobilemenu === 'open';
    const isMobileSearchOpen = mobilesearch === 'open';

    const mobileMenu = (
      <TopbarMobileMenu
        isAuthenticated={isAuthenticated}
        currentUserHasListings={currentUserHasListings}
        currentUser={currentUser}
        onLogout={this.handleLogout}
        notificationCount={notificationCount}
        currentPage={resolvedCurrentPage}
        customLinks={customLinks}
        categories={categories}
      />
    );

    const topbarSearcInitialValues = () => {
      if (isMainSearchTypeKeywords(config)) {
        return { keywords };
      }

      // Only render current search if full place object is available in the URL params
      const locationFieldsPresent = isOriginInUse(config)
        ? address && origin && bounds
        : address && bounds;
      return {
        location: locationFieldsPresent
          ? {
              search: address,
              selectedPlace: { address, origin, bounds },
            }
          : null,
      };
    };

    const LoginLink = () => {
      return (
        <NamedLink name="LoginPage" className={cssDesktop.topbarLink}>
          <img src={loginIcon} alt="Login" className={css.loginIcon} />
        </NamedLink>
      );
    };

    const ProfileMenu = ({ currentPage, currentUser, onLogout }) => {
      const currentPageClass = page => {
        const isAccountSettingsPage =
          page === 'AccountSettingsPage' && ACCOUNT_SETTINGS_PAGES.includes(currentPage);
        return currentPage === page || isAccountSettingsPage ? cssDesktop.currentPage : null;
      };

      const notificationDot =
        notificationCount > 0 ? <div className={css.notificationDot} /> : null;

      const notificationCountBadge =
        notificationCount > 0 ? (
          <NotificationBadge className={css.notificationBadge} count={notificationCount} />
        ) : null;

      const inboxTab = currentUserHasListings ? 'sales' : 'orders';

      const displayName =
        currentUser?.attributes?.profile.firstName +
        ' ' +
        currentUser?.attributes?.profile.lastName;

      return (
        <Menu>
          <MenuLabel
            className={cssDesktop.profileMenuLabel}
            isOpenClassName={cssDesktop.profileMenuIsOpen}
          >
            {notificationDot}
            <Avatar className={cssDesktop.avatar} user={currentUser} disableProfileLink />
          </MenuLabel>
          <MenuContent className={css.profileMenuContent}>
            <MenuItem key="Greeting" className={css.greeting}>
              <FormattedMessage id="TopbarMobileMenu.greeting" values={{ displayName }} />
            </MenuItem>
            <MenuItem key="Inbox">
              <NamedLink
                className={classNames(cssDesktop.inbox, currentPageClass(`InboxPage:${inboxTab}`))}
                name="InboxPage"
                params={{ tab: inboxTab }}
              >
                <FormattedMessage id="TopbarMobileMenu.inboxLink" />
                {notificationCountBadge}
              </NamedLink>
            </MenuItem>
            <MenuItem key="ManageListingsPage">
              <NamedLink
                className={classNames(cssDesktop.menuLink, currentPageClass('ManageListingsPage'))}
                name="ManageListingsPage"
              >
                <FormattedMessage id="TopbarDesktop.yourListingsLink" />
              </NamedLink>
            </MenuItem>
            <MenuItem key="FavoriteListingsPage">
              <NamedLink
                className={classNames(
                  cssDesktop.yourListingsLink,
                  currentPageClass('FavoriteListingsPage')
                )}
                name="FavoriteListingsPage"
              >
                <FormattedMessage id="TopbarDesktop.favoriteListingsLink" />
              </NamedLink>
            </MenuItem>
            <MenuItem key="ProfileSettingsPage">
              <NamedLink
                className={classNames(cssDesktop.menuLink, currentPageClass('ProfileSettingsPage'))}
                name="ProfileSettingsPage"
              >
                <FormattedMessage id="TopbarDesktop.profileSettingsLink" />
              </NamedLink>
            </MenuItem>
            <MenuItem key="AccountSettingsPage">
              <NamedLink
                className={classNames(cssDesktop.menuLink, currentPageClass('AccountSettingsPage'))}
                name="AccountSettingsPage"
              >
                <FormattedMessage id="TopbarDesktop.accountSettingsLink" />
              </NamedLink>
            </MenuItem>
            <MenuItem key="logout">
              <InlineTextButton rootClassName={css.logoutButton} onClick={this.handleLogout}>
                <FormattedMessage id="TopbarDesktop.logout" />
              </InlineTextButton>
            </MenuItem>
          </MenuContent>
        </Menu>
      );
    };

    const TopbarRightNav = props => {
      const { currentUser, currentPage, isAuthenticated, onLogout } = props;
      const [mounted, setMounted] = useState(false);

      useEffect(() => {
        setMounted(true);
      }, []);

      const authenticatedOnClientSide = mounted && isAuthenticated;
      const isAuthenticatedOrJustHydrated = isAuthenticated || !mounted;

      const profileMenuMaybe = authenticatedOnClientSide ? (
        <ProfileMenu currentPage={currentPage} currentUser={currentUser} onLogout={onLogout} />
      ) : null;

      const loginLinkMaybe = isAuthenticatedOrJustHydrated ? null : <LoginLink />;

      return (
        <>
          {profileMenuMaybe}
          {loginLinkMaybe}
        </>
      );
    };
    const initialSearchFormValues = topbarSearcInitialValues();
    const classes = classNames(rootClassName || css.root, className);

    return (
      <div className={classes}>
        <LimitedAccessBanner
          isAuthenticated={isAuthenticated}
          isLoggedInAs={isLoggedInAs}
          authScopes={authScopes}
          currentUser={currentUser}
          onLogout={this.handleLogout}
          currentPage={resolvedCurrentPage}
        />
        <div className={css.container}>
          <Button
            rootClassName={css.menu}
            onClick={this.handleMobileMenuOpen}
            title={intl.formatMessage({ id: 'Topbar.menuIcon' })}
          >
            <MenuIcon className={css.menuIcon} />
          </Button>
          {resolvedCurrentPage !== 'LandingPage' && (
            <LinkedLogo
              layout={'mobile'}
              alt={intl.formatMessage({ id: 'Topbar.logoIcon' })}
              linkToExternalSite={config?.topbar?.logoLink}
            />
          )}
          <TopbarSearchForm
            className={css.searchBar}
            desktopInputRoot={css.topbarSearchWithLeftPadding}
            onSubmit={this.handleSubmit}
            initialValues={initialSearchFormValues}
            appConfig={config}
          />
          <NamedLink className={css.browseListing} name="SearchPage">
            Browse All Listings
          </NamedLink>
          <NamedLink className={css.createListing} name="NewListingPage">
            <FormattedMessage id="TopbarDesktop.createListing" />
          </NamedLink>
          {/* Mobile search button */}
          {/* <Button
            rootClassName={css.searchMenu}
            onClick={this.handleMobileSearchOpen}
            title={intl.formatMessage({ id: 'Topbar.searchIcon' })}
          >
            <SearchIcon className={css.searchMenuIcon} />
          </Button> */}
          {<TopbarRightNav {...this.props} />}
        </div>
        <div className={css.desktop}>
          <TopbarDesktop
            className={desktopClassName}
            currentUserHasListings={currentUserHasListings}
            currentUser={currentUser}
            currentPage={resolvedCurrentPage}
            initialSearchFormValues={initialSearchFormValues}
            intl={intl}
            pathName={location.pathname}
            isAuthenticated={isAuthenticated}
            notificationCount={notificationCount}
            onLogout={this.handleLogout}
            onSearchSubmit={this.handleSubmit}
            config={config}
            customLinks={customLinks}
          />
        </div>
        <Modal
          id="TopbarMobileMenu"
          containerClassName={css.modalContainer}
          isOpen={isMobileMenuOpen}
          onClose={this.handleMobileMenuClose}
          usePortal
          onManageDisableScrolling={onManageDisableScrolling}
        >
          {authInProgress ? null : mobileMenu}
        </Modal>
        <Modal
          id="TopbarMobileSearch"
          containerClassName={css.modalContainerSearchForm}
          isOpen={isMobileSearchOpen}
          onClose={this.handleMobileSearchClose}
          usePortal
          onManageDisableScrolling={onManageDisableScrolling}
        >
          <div className={css.searchContainer}>
            <TopbarSearchForm
              onSubmit={this.handleSubmit}
              initialValues={initialSearchFormValues}
              isMobile
              appConfig={config}
            />
            <p className={css.mobileHelp}>
              <FormattedMessage id="Topbar.mobileSearchHelp" />
            </p>
          </div>
        </Modal>
        <ModalMissingInformation
          id="MissingInformationReminder"
          containerClassName={css.missingInformationModal}
          currentUser={currentUser}
          currentUserHasListings={currentUserHasListings}
          currentUserHasOrders={currentUserHasOrders}
          location={location}
          onManageDisableScrolling={onManageDisableScrolling}
          onResendVerificationEmail={onResendVerificationEmail}
          sendVerificationEmailInProgress={sendVerificationEmailInProgress}
          sendVerificationEmailError={sendVerificationEmailError}
        />

        <GenericError show={showGenericError} />
      </div>
    );
  }
}

TopbarComponent.defaultProps = {
  className: null,
  rootClassName: null,
  desktopClassName: null,
  mobileRootClassName: null,
  mobileClassName: null,
  notificationCount: 0,
  currentUser: null,
  currentUserHasOrders: null,
  currentPage: null,
  sendVerificationEmailError: null,
  authScopes: [],
};

TopbarComponent.propTypes = {
  className: string,
  rootClassName: string,
  desktopClassName: string,
  mobileRootClassName: string,
  mobileClassName: string,
  isAuthenticated: bool.isRequired,
  isLoggedInAs: bool.isRequired,
  authScopes: array,
  authInProgress: bool.isRequired,
  currentUser: propTypes.currentUser,
  currentUserHasListings: bool.isRequired,
  currentUserHasOrders: bool,
  currentPage: string,
  notificationCount: number,
  onLogout: func.isRequired,
  onManageDisableScrolling: func.isRequired,
  onResendVerificationEmail: func.isRequired,
  sendVerificationEmailInProgress: bool.isRequired,
  sendVerificationEmailError: propTypes.error,
  showGenericError: bool.isRequired,

  // These are passed from Page to keep Topbar rendering aware of location changes
  history: shape({
    push: func.isRequired,
  }).isRequired,
  location: shape({
    search: string.isRequired,
  }).isRequired,

  // from useIntl
  intl: intlShape.isRequired,

  // from useConfiguration
  config: object.isRequired,

  // from useRouteConfiguration
  routeConfiguration: arrayOf(propTypes.route).isRequired,
};

const Topbar = props => {
  const config = useConfiguration();
  const routeConfiguration = useRouteConfiguration();
  const intl = useIntl();
  return (
    <TopbarComponent
      config={config}
      routeConfiguration={routeConfiguration}
      intl={intl}
      {...props}
    />
  );
};

export default Topbar;
