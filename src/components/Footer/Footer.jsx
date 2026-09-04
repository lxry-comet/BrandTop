import React, { Component } from 'react'

//? imports styles
import css from './Footer.module.css'

//? imports components

export class Footer extends Component {
	render() {
		const navLinks = ['Główna', 'Katalog', 'Wideo', 'O nas']

		const serviceLinks = [
			'Dostawa i płatność',
			'Regulamin sklepu',
			'Polityka prywatności',
			'Zwroty i reklamacje',
			'FAQ'
		]

		const socialLinks = [
			{ name: 'Instagram', href: '#' },
			{ name: 'Facebook', href: '#' },
			{ name: 'TikTok', href: '#' }
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
									Sklep z premium sneakersami i modą uliczną — Nike, Adidas,
									Jordan, New Balance i inne kultowe marki. Gwarantujemy 100%
									oryginalności każdego produktu.
								</p>
								<div className={css.footer__contacts}>
									<a
										href='tel:+48502725148'
										className={css.footer__contactItem}
									>
										+48 502 725 148
									</a>
									<a
										href='mailto:lakos827@gmail.com'
										className={css.footer__contactItem}
									>
										lakos827@gmail.com
									</a>
									<span className={css.footer__contactItem}>
										Bohaterów Września 80, Świnoujście
									</span>
								</div>
							</div>

							{/* Nawigacja */}
							<div className={css.footer__nav}>
								<h4 className={css.footer__title}>NAWIGACJA</h4>
								{navLinks.map(link => (
									<a key={link} href='#' className={css.footer__link}>
										{link}
									</a>
								))}
							</div>

							{/* Obsługa klienta + social media */}
							<div className={css.footer__service}>
								<h4 className={css.footer__title}>OBSŁUGA KLIENTA</h4>
								{serviceLinks.map(link => (
									<a key={link} href='#' className={css.footer__link}>
										{link}
									</a>
								))}
							</div>
							<div className={css.footer__social}>
								{socialLinks.map(social => (
									<a
										key={social.name}
										href={social.href}
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
								© 2025 Brand-Top. Wszelkie prawa zastrzeżone.
							</p>
						</div>
					</div>
				</footer>
			</>
		)
	}
}
export default Footer
