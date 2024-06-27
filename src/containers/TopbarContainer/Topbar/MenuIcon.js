import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import css from './Topbar.module.css';

const MenuIcon = props => {
  const { className, rootClassName } = props;
  const classes = classNames(rootClassName || css.rootMenuIcon, className);

  return (
    <svg
      width="35"
      className={classes}
      height="30"
      viewBox="0 0 28 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line y1="1.25" x2="28" y2="1.25" stroke="black" stroke-width="1.5" />
      <line y1="21.25" x2="28" y2="21.25" stroke="black" stroke-width="1.5" />
      <line y1="11.25" x2="28" y2="11.25" stroke="black" stroke-width="1.5" />
    </svg>
  );
};

const { string } = PropTypes;

MenuIcon.defaultProps = {
  className: null,
  rootClassName: null,
};

MenuIcon.propTypes = {
  className: string,
  rootClassName: string,
};

export default MenuIcon;
