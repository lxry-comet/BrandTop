import React, { Component } from 'react'
import { Link } from 'react-router-dom'

//? imports styles
import css from './Footer.module.css'

//? imports components

export class Footer extends Component {
	render() {
		// Te same trasy, co w Header.jsx (navLinks) — nawigacja w footerze
		// prowadzi do tych samych stron co w górnym menu.
		const navLinks = [
			{ label: 'Główna', path: '/' },
			{ label: 'Katalog', path: '/catalog' },
			// { label: 'Wideo', path: '/wideo' },
			{ label: 'O nas', path: '/contact' }
		]

		// Statyczne strony HTML w public/legal/ — otwierane w nowej karcie,
		// bazowa ścieżka uwzględnia import.meta.env.BASE_URL (podfolder
		// GitHub Pages, tak jak przy image/<SKU>.jpg w Catalog.jsx).
		const legalBase = `${import.meta.env.BASE_URL}legal/`
		const serviceLinks = [
			{ label: 'Dostawa i płatność', href: `${legalBase}dostawa-i-platnosc.html` },
			{ label: 'Regulamin sklepu', href: `${legalBase}regulamin.html` },
			{ label: 'Polityka prywatności', href: `${legalBase}polityka-prywatnosci.html` },
			{ label: 'Zwroty i reklamacje', href: `${legalBase}zwroty-i-reklamacje.html` },
			{ label: 'FAQ', href: `${legalBase}faq.html` }
		]

		const socialLinks = [
			{ name: 'Instagram', href: 'https://www.instagram.com/brand.top.sneakers/' },
			// { name: 'Facebook', href: '#' },
			// { name: 'TikTok', href: '#' }
		]

		const paymentBadges = [
			'Karta płatnicza',
			'BLIK',
			'Przelew',
			'Apple Pay',
			'Google Pay',
			'Kurier',
			'Paczkomat',
			'Odbiór osobisty'
		]

		return (
			<>
				<footer className={css.footer}>
					<div className='container'>
						<div className={css.footer__top}>
							{/* Brand + opis + kontakty */}
							<div className={css.footer__brand}>
								<div className={css.footer__logo}>
									BRAND<span className={css.footer__logoAccent}>-TOP</span>
								</div>
								<p className={css.footer__text}>
									• sprzedaż limitowanych sneakersów 👌🏻<br/>
									• zamówienia składane on line📲<br/>
									• gwarancja oryginalności 💯<br/>
									• towar dostępny w sklepie stacjonarnym🤝<br/>
								</p>
								<div className={css.footer__contacts}>
									<a
										href='tel:+48502725148'
										className={css.footer__contactItem}
									>
										+48 502 725 148
									</a>
									<a
										href='mailto:goadera1@o2.pl'
										className={css.footer__contactItem}
									>
										goadera1@o2.pl
									</a>
									<span className={css.footer__contactItem}>
										Bohaterów Września 80, Świnoujście
									</span>
								</div>
							</div>

							{/* Nawigacja */}
							<div className={css.footer__nav}>
								<h4 className={css.footer__title}>NAWIGACJA</h4>
								{navLinks.map(({ label, path }) => (
									<Link key={path} to={path} className={css.footer__link}>
										{label}
									</Link>
								))}
							</div>

							{/* Obsługa klienta + social media */}
							<div className={css.footer__service}>
								<h4 className={css.footer__title}>OBSŁUGA KLIENTA</h4>
								{serviceLinks.map(({ label, href }) => (
									<a
										key={label}
										href={href}
										target='_blank'
										rel='noopener noreferrer'
										className={css.footer__link}
									>
										{label}
									</a>
								))}
							</div>
							<div className={css.footer__social}>
								{socialLinks.map(social => (
									<a
										key={social.name}
										href={social.href}
										target={social.href !== '#' ? '_blank' : undefined}
										rel={social.href !== '#' ? 'noopener noreferrer' : undefined}
										className={css.footer__socialLink}
									>
										{social.name}
									</a>
								))}
							</div>
							{/* Płatności i dostawa */}
							<div className={css.footer__payments}>
								<h4 className={css.footer__title}>PŁATNOŚCI I DOSTAWA</h4>
								<div className={css.footer__badges}>
									{paymentBadges.map(badge => (
										<span key={badge} className={css.footer__badge}>
											{badge}
										</span>
									))}
								</div>
							</div>
						</div>

						<div className={css.footer__bottom}>
							<p className={css.footer__copy}>
								© 2026 Brand-Top. Wszelkie prawa zastrzeżone.
							</p>
						</div>
					</div>
				</footer>
			</>
		)
	}
}
export default Footer