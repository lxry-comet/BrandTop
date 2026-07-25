import React, { Component } from 'react'

//? imports styles
import css from './Contacts.module.css'

//? imports components

export class Contacts extends Component {
	state = {
		email: '',
		message: ''
	}

	handleEmailChange = (e) => {
		this.setState({ email: e.target.value })
	}

	handleMessageChange = (e) => {
		this.setState({ message: e.target.value })
	}

	handleSend = () => {
		const { email, message } = this.state

		if (!email.trim() || !message.trim()) {
			alert('Proszę wypełnić adres e-mail i wiadomość.')
			return
		}

		alert('Dziękujemy! Wiadomość została wysłana. Odezwiemy się wkrótce.')
		this.setState({ email: '', message: '' })
	}

	handleMapImageError = (e) => {
		e.target.style.display = 'none'
	}

	render() {
		//! [1] Блок диструктуризації props та state
		const { email, message } = this.state

		//! [2] Блок обчислювальних дaних

		//! [3] Блок консолей необхідних даних

		return (
			<>
				<section className={css.contacts} id='contact'>
					<div className={css.contacts__box}>
						<div className={css.contacts__mapside}>
							<div className={css.contacts__maplabel}>Tutaj nas znajdziesz</div>
							<a
								className={css.contacts__maplink}
								href='https://www.google.com/maps/search/Brand-Top+sklep+Kraków'
								target='_blank'
								rel='noopener noreferrer'
							>
								<div className={css.contacts__mappreview}>
									<img
										src='https://maps.googleapis.com/maps/api/staticmap?center=Krak%C3%B3w,Poland&zoom=14&size=400x260&maptype=roadmap&markers=color:red|Krak%C3%B3w,Poland&style=feature:all|element:geometry|color:0x242f3e&style=feature:all|element:labels.text.stroke|color:0x242f3e&style=feature:all|element:labels.text.fill|color:0x746855&key=nokey'
										alt='Mapa'
										onError={this.handleMapImageError}
									/>
									<div className={css.contacts__mapoverlay}>
										<span className={css.contacts__mappin}>📍</span>
										<span className={css.contacts__mapcta}>Otwórz w Google Maps</span>
									</div>
								</div>
							</a>
						</div>

						<div className={css.contacts__formside}>
							<div className={css.contacts__formtitle}>Chcesz się z nami skontaktować?</div>
							<input
								className={css.contacts__input}
								type='email'
								placeholder='Twój adres e-mail'
								value={email}
								onChange={this.handleEmailChange}
							/>
							<textarea
								className={`${css.contacts__input} ${css.contacts__textarea}`}
								placeholder='Twoja wiadomość…'
								value={message}
								onChange={this.handleMessageChange}
							/>
							<button className={css.contacts__sendbtn} onClick={this.handleSend}>
								Wyślij
							</button>
							<div className={css.contacts__or}>
								<span>lub</span>
							</div>
							<div className={css.contacts__phoneblock}>
								<span className={css.contacts__phoneicon}>📞</span>
								<div>
									<a href='tel:+48123456789' className={css.contacts__phonenumber}>
										+48 123 456 789
									</a>
									<div className={css.contacts__phonehint}>zadzwoń lub wyślij SMS</div>
								</div>
							</div>
						</div>
					</div>
				</section>
			</>
		)
	}
}
export default Contacts
