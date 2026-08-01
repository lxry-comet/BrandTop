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
		showTitle: false
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
	render() {
		//! [1] Блок диструктуризації props та state

		//! [2] Блок обчислювальних дaних
		const { showTitle } = this.state
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
								<div className={css.header__btn}>
									<FaHeart />
								</div>
								<div className={css.header__btn}>
									<FaUser />
								</div>
								<Link to='/cart' className={css.header__btn}>
									<FaCartShopping />
								</Link>
							</div>
						</div>
						<div className={css.header__search}>
							<div className={css.navbar}>
								{navLinks.map(({ label, path }) => (
									<NavLink
										key={path}
										to={path}
										end={path === '/'}
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
