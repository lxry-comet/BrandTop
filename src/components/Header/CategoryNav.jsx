import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import css from './Header.module.css'

const categoryLinks = [
	{ label: 'Wszystko', type: null },
	{ label: 'Obuwie', type: 'Obuwie' },
	{ label: 'Odzież', type: 'Odzież' },
	{ label: 'Akcesoria', type: 'Akcesoria' }
]

export default function CategoryNav() {
	const location = useLocation()
	const isCatalogPage = location.pathname.startsWith('/catalog')

	if (!isCatalogPage) return null

	const currentType = new URLSearchParams(location.search).get('type')

	return (
		<div className={css.categoryNav}>
			{categoryLinks.map(({ label, type }) => (
				<NavLink
					key={label}
					to={type ? `/catalog?type=${type}` : '/catalog'}
					className={() =>
						`${css.nav__link} ${currentType === type ? css.active : ''}`
					}
				>
					{label}
				</NavLink>
			))}
		</div>
	)
}