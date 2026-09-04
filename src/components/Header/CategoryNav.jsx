import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import css from './Header.module.css'

// WAŻNE: te wartości muszą się dokładnie zgadzać z products.type w bazie —
// a Admin.jsx (formularz dodawania produktu) zapisuje je jako małe litery bez
// polskich znaków ('obuwie' / 'odziez' / 'akcesoria', patrz TYPE_OPTIONS w
// Admin.jsx). Wcześniej ten plik linkował na skapitalizowane polskie słowa
// ('Obuwie', 'Odzież'...), które NIE pasowały do nowych produktów zapisanych
// przez Admin — stąd wrażenie, że filtr kategorii działa tylko dla obuwia
// (jeśli akurat te rekordy miały type zapisany ręcznie jako 'Obuwie').
const categoryLinks = [
	{ label: 'Wszystko', type: null },
	{ label: 'Obuwie', type: 'obuwie' },
	{ label: 'Odzież', type: 'odziez' },
	{ label: 'Akcesoria', type: 'akcesoria' }
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