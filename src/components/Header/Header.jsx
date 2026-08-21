import React, { Component } from 'react'
import { NavLink } from 'react-router-dom'
import { Link } from 'react-router-dom'

//? imports styles
import css from './Header.module.css'

//? imports components
import { FaHeart } from 'react-icons/fa'
import { FaUser } from 'react-icons/fa'
import { FaCartShopping } from 'react-icons/fa6'
import CategoryNav from './CategoryNav.jsx'

export class Header extends Component {
	state = {
		showTitle: false,
		menuOpen: false
		// activeIndexNavLinks: 0
	}
	interval = null
	componentDidMount() {
		this.interval = setInterval(() => {
			this.setState(prev => ({ showTitle: !prev.showTitle }))
		}, 3000)
	}
	componentWillUnmount() {
		clearInterval(this.interval)
	}
	toggleMenu = () => {
		this.setState(prev => ({ menuOpen: !prev.menuOpen }))
	}
	closeMenu = () => {
		this.setState({ menuOpen: false })
	}
	render() {
		//! [1] Блок диструктуризації props та state

		//! [2] Блок обчислювальних дaних
		const { showTitle, menuOpen } = this.state
		const navLinks = [
			{ label: 'Główna', path: '/' },
			{ label: 'Katalog', path: '/catalog' },
			{ label: 'Wideo', path: '/wideo' },
			{ label: 'O nas', path: '/contact' }
		]
		//! [3] Блок консолей необхідних даних

		return (
			<>
				<header className={css.header}>
					<div className={css.header__container}>
						<div className={css.header__nav}>
							<div
								className={css.header__logo}
								title='Strona główna'
								// onclick="navTo('home')"
							>
								<div className={css.logo__text}>
									<div
										className={`${css.logo__item} ${!showTitle ? css.active : ''}`}
									>
										<span>
											Brand
											<span className={css.accent}>-Top</span>
										</span>
									</div>
									<div
										className={`${css.logo__item} ${showTitle ? css.active : ''}`}
									>
										<span>Witaj</span>
									</div>
								</div>
							</div>
							<div className={css.header__actions}>
								<Link
									to='/favorites'
									className={`${css.header__btn} ${css.header__btnDesktopOnly}`}
									onClick={this.closeMenu}
								>
									<FaHeart />
								</Link>
								{this.props.user ? (
									<Link
										to='/account'
										className={`${css.header__btn} ${css.header__btnDesktopOnly}`}
										aria-label='Moje konto'
									>
										<FaUser />
									</Link>
								) : (
									<button
										type='button'
										className={`${css.header__btn} ${css.header__btnDesktopOnly}`}
										onClick={this.props.onAccountClick}
										aria-label='Zaloguj się'
									>
										<FaUser />
									</button>
								)}
								<Link
									to='/cart'
									className={`${css.header__btn} ${css.header__btnDesktopOnly}`}
									onClick={this.closeMenu}
								>
									<FaCartShopping />
								</Link>
								<button
									type='button'
									className={`${css.burger__btn} ${menuOpen ? css.burger__btnOpen : ''}`}
									onClick={this.toggleMenu}
									aria-label='Menu'
									aria-expanded={menuOpen}
								>
									<span></span>
									<span></span>
									<span></span>
								</button>
							</div>
						</div>
						<div
							className={`${css.header__search} ${menuOpen ? css.header__searchOpen : ''}`}
						>
							<div className={css.mobile_actions}>
								<Link
									to='/favorites'
									className={css.mobile_actionLink}
									onClick={this.closeMenu}
								>
									<FaHeart />
									<span>Ulubione</span>
								</Link>
								<Link
									to='/cart'
									className={css.mobile_actionLink}
									onClick={this.closeMenu}
								>
									<FaCartShopping />
									<span>Koszyk</span>
								</Link>
								{this.props.user ? (
									<Link
										to='/account'
										className={css.mobile_actionLink}
										onClick={this.closeMenu}
									>
										<FaUser />
										<span>Moje konto</span>
									</Link>
								) : (
									<button
										type='button'
										className={css.mobile_actionLink}
										onClick={() => {
											this.closeMenu()
											this.props.onAccountClick && this.props.onAccountClick()
										}}
									>
										<FaUser />
										<span>Konto</span>
									</button>
								)}
							</div>
							<div className={css.navbar}>
								{navLinks.map(({ label, path }) => (
									<NavLink
										key={path}
										to={path}
										end={path === '/'}
										onClick={this.closeMenu}
										className={({ isActive }) =>
											`${css.nav__link} ${isActive ? css.active : ''}`
										}
									>
										{label}
									</NavLink>
								))}
							</div>
							<div className={css.search__box}>
								<span className={css.search__icon}>🔍</span>
								<input
									type='text'
									id='searchInput'
									placeholder='Szukaj sneakersów...'
									// onChange={onSearch}
									autocomplete='off'
								></input>
							</div>
						</div>
						<CategoryNav />
					</div>
				</header>
			</>
		)
	}
}
export default Header
