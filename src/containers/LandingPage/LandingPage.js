import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
const { arrayOf, bool, object } = PropTypes;
import classNames from 'classnames';

import loadable from '@loadable/component';
import { ASSET_NAME } from './LandingPage.duck';

import SectionContainer from '../PageBuilder/SectionBuilder/SectionContainer';
import SectionFeaturesLanding from '../../containers/PageBuilder/SectionBuilder/SectionFeaturesLanding';
import cssCarousel from '../PageBuilder/SectionBuilder/SectionCarousel/SectionCarousel.module.css';

import { compose } from 'redux';
import { connect } from 'react-redux';

import { camelize } from '../../util/string';
import { propTypes } from '../../util/types';

import FallbackPage from './FallbackPage';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { injectIntl } from '../../util/reactIntl';
import { getListingsById } from '../../ducks/marketplaceData.duck';

import css from './LandingPage.module.css';
const PageBuilder = loadable(() =>
  import(/* webpackChunkName: "PageBuilder" */ '../PageBuilder/PageBuilder')
);

import {
  H3,
  PaginationLinks,
  ListingCard,
} from '../../components';

const SectionUser = props => {
  const { sectionId, displayName, listingData } = props;
  const panelWidth = 62.5;
  // Render hints for responsive image
  const renderSizes = [
    `(max-width: 767px) 100vw`,
    `(max-width: 1920px) ${panelWidth / 2}vw`,
    `${panelWidth / 3}vw`,
  ].join(', ');

  const KEY_CODE_ARROW_LEFT = 37;
  const KEY_CODE_ARROW_RIGHT = 39;
  
  // The number of columns (numColumns) affects styling and responsive images
  const COLUMN_CONFIG = [
    { css: cssCarousel.oneColumn, responsiveImageSizes: '(max-width: 767px) 100vw, 1200px' },
    { css: cssCarousel.twoColumns, responsiveImageSizes: '(max-width: 767px) 100vw, 600px' },
    { css: cssCarousel.threeColumns, responsiveImageSizes: '(max-width: 767px) 100vw, 400px' },
    { css: cssCarousel.fourColumns, responsiveImageSizes: '(max-width: 767px) 100vw, 290px' },
  ];

  const numColumns = 2
  const getIndex = numColumns => numColumns - 1;
  const getColumnCSS = numColumns => {
    const config = COLUMN_CONFIG[getIndex(numColumns)];
    return config ? config.css : COLUMN_CONFIG[0].css;
  };
  const getResponsiveImageSizes = numColumns => {
    const config = COLUMN_CONFIG[getIndex(numColumns)];
    return config ? config.responsiveImageSizes : COLUMN_CONFIG[0].responsiveImageSizes;
  };
  const sliderContainerId = `listings-carousel-container`;
  const sliderId = `listings-slider`;
  const numberOfBlocks = listingData?.length;
  const hasBlocks = numberOfBlocks > 0;

  useEffect(() => {
    const setCarouselWidth = () => {
      if (hasBlocks) {
        const windowWidth = window.innerWidth;
        const elem = window.document.getElementById(sliderContainerId);
        const scrollbarWidth = window.innerWidth - document.body.clientWidth;
        const elementWidth =
          elem.clientWidth >= windowWidth - scrollbarWidth ? windowWidth : elem.clientWidth;
        const carouselWidth = elementWidth - scrollbarWidth;

        elem.style.setProperty('--carouselWidth', `${carouselWidth}px`);
      }
    };
    setCarouselWidth();

    window.addEventListener('resize', setCarouselWidth);
    return () => window.removeEventListener('resize', setCarouselWidth);
  }, []);

  const onSlideLeft = e => {
    var slider = window.document.getElementById(sliderId);
    const slideWidth = numColumns * slider?.firstChild?.clientWidth;
    slider.scrollLeft = slider.scrollLeft - slideWidth;
    // Fix for Safari
    e.target.focus();
  };

  const onSlideRight = e => {
    var slider = window.document.getElementById(sliderId);
    const slideWidth = numColumns * slider?.firstChild?.clientWidth;
    slider.scrollLeft = slider.scrollLeft + slideWidth;
    // Fix for Safari
    e.target.focus();
  };

  const onKeyDown = e => {
    if (e.keyCode === KEY_CODE_ARROW_LEFT) {
      // Prevent changing cursor position in input
      e.preventDefault();
      onSlideLeft(e);
    } else if (e.keyCode === KEY_CODE_ARROW_RIGHT) {
      // Prevent changing cursor position in input
      e.preventDefault();
      onSlideRight(e);
    }
  };

  return (
    <SectionContainer id={sectionId}>
        {/* {queryInProgress ? loadingResults : null}
        {queryFavoritesError ? queryError : null} */}
        <div className={cssCarousel.carouselContainer} id={sliderContainerId}>
          <div
            className={classNames(cssCarousel.carouselArrows, {
              [css.notEnoughBlocks]: numberOfBlocks <= numColumns,
            })}
          >
            <button className={cssCarousel.carouselArrowPrev} onClick={onSlideLeft} onKeyDown={onKeyDown}>
              ‹
            </button>
            <button className={cssCarousel.carouselArrowNext} onClick={onSlideRight} onKeyDown={onKeyDown}>
              ›
            </button>
          </div>
          <div className={getColumnCSS(numColumns)} id={sliderId}>
              {listingData.map(l => (
                <div className={cssCarousel.block}>
                <ListingCard
                  className={cssCarousel.listingCard}
                  key={l.id.uuid}
                  listing={l}
                  renderSizes={renderSizes}
                />
                </div>
              ))}
          </div>
        </div>
    </SectionContainer>
  );
};



export const LandingPageComponent = props => {
  const { 
    pageAssetsData, 
    inProgress, 
    error, 
    isAuthenticated, 
    currentUser, 
    listings, 
    pagination, 
    queryInProgress,
    queryFavoritesError, 
    queryParams, 
    scrollingDisabled, 
    intl
  } = props;

 const pageData = pageAssetsData?.[camelize(ASSET_NAME)]?.data;

  const sectionUserName = {
    sectionId: 'authenticated-user',
    sectionType: 'customUser',
    displayName: currentUser?.attributes?.profile?.displayName,
    listingData: listings,
  };
  
  const customSections = 
    pageData ? [pageData.sections[0], pageData.sections[1], sectionUserName, pageData.sections[2]] : pageData?.sections
    
  const sectionOverrides = {
  
  };

  return (
    <>
   <PageBuilder
     pageAssetsData={{
        sections: customSections,
      }}
      options={{
        sectionComponents: {
          customUser: { component: SectionUser,  },
          features: { component: SectionFeaturesLanding },
        },
      }}
      inProgress={inProgress}
      error={error}
      fallbackPage={<FallbackPage error={error} />}
    />
    </>
  );
};

LandingPageComponent.propTypes = {
  pageAssetsData: object,
  inProgress: bool,
  error: propTypes.error,
  listings: arrayOf(propTypes.listing),
  pagination: propTypes.pagination,
  queryInProgress: bool.isRequired,
  queryFavoritesError: propTypes.error,
  queryParams: object,


};

const mapStateToProps = state => {

  const { pageAssetsData, inProgress, error } = state.hostedAssets || {};
  const { isAuthenticated } = state.auth;
  const { currentUser } = state.user;

  const {
    currentPageResultIds,
    pagination,
    queryInProgress,
    queryFavoritesError,
    queryParams,
  } = state.LandingPage;

  const listings = getListingsById(state, currentPageResultIds);

  return { 
    pageAssetsData, 
    inProgress, 
    error, 
    isAuthenticated, 
    currentUser,
    currentPageResultIds,
    listings,
    pagination,
    queryInProgress,
    queryFavoritesError,
    queryParams,
    scrollingDisabled: isScrollingDisabled(state),
  };
};

// Note: it is important that the withRouter HOC is **outside** the
// connect HOC, otherwise React Router won't rerender any Route
// components since connect implements a shouldComponentUpdate
// lifecycle hook.
//
// See: https://github.com/ReactTraining/react-router/issues/4671
const LandingPage = compose(connect(
  mapStateToProps,
  injectIntl
  )
)(LandingPageComponent);

export default LandingPage;