// src/components/AuthModal/AuthModal.jsx
//
// Klasowy komponent React do logowania / rejestracji, podłączony pod Supabase Auth.
// Napisany w tej samej konwencji co Twój Catalog.jsx / App.jsx: `export class X
// extends Component`, `state = {...}` i metody jako pola klasy (arrow function),
// CSS Modules (`css.xxx`), import przez alias `@/...` — bez PropTypes.
//
// Wymaga:
//   npm install @supabase/supabase-js
//   src/lib/supabaseClient.js (patrz plik obok — jeśli Twój klient Supabase leży
//   pod innym aliasem niż @/lib/supabaseClient, popraw import poniżej)
//
// Import w App.jsx już u Ciebie istnieje:
//   import { AuthModal } from '@/components/AuthModal/AuthModal.jsx'
// Podłączenie w App (patrz przykład na końcu tego pliku w komentarzu) — App jest
// klasą, więc modal najwygodniej trzymać w jej state, obok przycisku „👤” w Header
// (albo podnieść stan wyżej, jeśli Header ma wywoływać otwarcie modala przez props).
//
// Po zalogowaniu user.id (uuid z Supabase Auth) to ten sam user_id, którego
// używają funkcje z favoritesCartService.js (addToCart, toggleFavorite, itd.)
// i który trafia jako product_id (text) do favorites/cart_items — patrz supabase_schema.sql.
//
// Przykład podłączenia w App.jsx (Twój plik, class component):
//
//   export class App extends Component {
//     state = { authOpen: false, user: null }
//
//     openAuth = () => this.setState({ authOpen: true })
//     closeAuth = () => this.setState({ authOpen: false })
//     handleAuthSuccess = (user) => this.setState({ user, authOpen: false })
//
//     render() {
//       return (
//         <>
//           <Header onAccountClick={this.openAuth} user={this.state.user} />
//           <BrandStrip/>
//           <AppRoutes/>
//           <Footer/>
//           <AuthModal
//             isOpen={this.state.authOpen}
//             onClose={this.closeAuth}
//             onAuthSuccess={this.handleAuthSuccess}
//           />
//         </>
//       )
//     }
//   }
//
// (Header musi wtedy wywoływać this.props.onAccountClick() na przycisku „👤”
// zamiast/obok obecnego navTo('account') z brandtop_modified_9.html.)

import { Component } from 'react';
import { supabase } from '@/lib/supabaseClient';
import css from './AuthModal.module.css';

const MODE_LOGIN = 'login';
const MODE_REGISTER = 'register';

const INITIAL_FORM = {
	firstName: '',
	lastName: '',
	email: '',
	password: '',
	confirmPassword: ''
};

export class AuthModal extends Component {
	state = {
		mode: MODE_LOGIN,
		form: { ...INITIAL_FORM },
		fieldErrors: {},
		serverError: '',
		successMessage: '',
		loading: false
	}

	switchMode = (mode) => {
		if (mode === this.state.mode) return
		this.setState({
			mode,
			fieldErrors: {},
			serverError: '',
			successMessage: ''
		})
	}

	handleChange = (event) => {
		const { name, value } = event.target
		this.setState(prev => ({
			form: { ...prev.form, [name]: value },
			fieldErrors: { ...prev.fieldErrors, [name]: '' },
			serverError: ''
		}))
	}

	handleClose = () => {
		if (this.state.loading) return
		this.setState({
			mode: MODE_LOGIN,
			form: { ...INITIAL_FORM },
			fieldErrors: {},
			serverError: '',
			successMessage: ''
		})
		this.props.onClose()
	}

	handleOverlayClick = (event) => {
		if (event.target === event.currentTarget) {
			this.handleClose()
		}
	}

	validate() {
		const { mode, form } = this.state
		const errors = {}

		if (mode === MODE_REGISTER) {
			if (!form.firstName.trim()) errors.firstName = 'Podaj imię.'
			if (!form.lastName.trim()) errors.lastName = 'Podaj nazwisko.'
		}

		if (!form.email.trim()) {
			errors.email = 'Podaj adres e-mail.'
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
			errors.email = 'Nieprawidłowy adres e-mail.'
		}

		if (!form.password) {
			errors.password = 'Podaj hasło.'
		} else if (mode === MODE_REGISTER && form.password.length < 8) {
			errors.password = 'Hasło musi mieć min. 8 znaków.'
		}

		if (mode === MODE_REGISTER && form.confirmPassword !== form.password) {
			errors.confirmPassword = 'Hasła nie są identyczne.'
		}

		this.setState({ fieldErrors: errors })
		return Object.keys(errors).length === 0
	}

	handleSubmit = async (event) => {
		event.preventDefault()
		if (!this.validate()) return

		this.setState({ loading: true, serverError: '', successMessage: '' })

		const { mode, form } = this.state

		try {
			if (mode === MODE_REGISTER) {
				const { data, error } = await supabase.auth.signUp({
					email: form.email.trim(),
					password: form.password,
					options: {
						data: {
							first_name: form.firstName.trim(),
							last_name: form.lastName.trim()
						}
					}
				})

				if (error) throw error

				// Jeśli w Supabase Auth włączone jest potwierdzanie e-maila,
				// data.session będzie puste do czasu kliknięcia w link z maila.
				if (!data.session) {
					this.setState({
						loading: false,
						successMessage: 'Konto utworzone! Sprawdź swoją skrzynkę e-mail, aby potwierdzić rejestrację.'
					})
					return
				}

				this.setState({ loading: false })
				this.props.onAuthSuccess(data.user)
				this.handleClose()
				return
			}

			// mode === MODE_LOGIN
			const { data, error } = await supabase.auth.signInWithPassword({
				email: form.email.trim(),
				password: form.password
			})

			if (error) throw error

			this.setState({ loading: false })
			this.props.onAuthSuccess(data.user)
			this.handleClose()
		} catch (error) {
			this.setState({
				loading: false,
				serverError: this.translateError(error)
			})
		}
	}

	translateError(error) {
		const message = error && error.message ? error.message : ''

		if (/already registered|already exists/i.test(message)) {
			return 'Konto z tym adresem e-mail już istnieje. Spróbuj się zalogować.'
		}
		if (/invalid login credentials/i.test(message)) {
			return 'Nieprawidłowy e-mail lub hasło.'
		}
		if (/email not confirmed/i.test(message)) {
			return 'Potwierdź adres e-mail przed zalogowaniem (sprawdź skrzynkę).'
		}
		if (/password.*at least/i.test(message)) {
			return 'Hasło jest zbyt słabe — użyj min. 8 znaków.'
		}

		return message || 'Coś poszło nie tak. Spróbuj ponownie.'
	}

	render() {
		const { isOpen } = this.props
		const { mode, form, fieldErrors, serverError, successMessage, loading } = this.state

		return (
			<div
				className={`${css.overlay}${isOpen ? ' ' + css.overlayShow : ''}`}
				onMouseDown={this.handleOverlayClick}
				role="presentation"
			>
				<div className={css.modal} role="dialog" aria-modal="true" aria-label="Logowanie i rejestracja">
					<button type="button" className={css.close} onClick={this.handleClose} aria-label="Zamknij">
						✕
					</button>

					<div className={css.header}>
						<div className={css.title}>Brand-Top</div>
						<div className={css.subtitle}>Zaloguj się lub załóż konto</div>
					</div>

					<div className={css.tabs}>
						<button
							type="button"
							className={`${css.tab}${mode === MODE_LOGIN ? ' ' + css.tabActive : ''}`}
							onClick={() => this.switchMode(MODE_LOGIN)}
						>
							Zaloguj się
						</button>
						<button
							type="button"
							className={`${css.tab}${mode === MODE_REGISTER ? ' ' + css.tabActive : ''}`}
							onClick={() => this.switchMode(MODE_REGISTER)}
						>
							Zarejestruj się
						</button>
					</div>

					{serverError && <div className={css.serverError}>{serverError}</div>}
					{successMessage && <div className={css.successMsg}>{successMessage}</div>}

					<form className={css.form} onSubmit={this.handleSubmit} noValidate>
						{mode === MODE_REGISTER && (
							<div className={css.row}>
								<div className={css.field}>
									<label htmlFor="authFirstName">Imię</label>
									<input
										id="authFirstName"
										name="firstName"
										type="text"
										className={`${css.input}${fieldErrors.firstName ? ' ' + css.inputError : ''}`}
										placeholder="Twoje imię"
										value={form.firstName}
										onChange={this.handleChange}
										disabled={loading}
										autoComplete="given-name"
									/>
									<div className={css.errorMsg}>{fieldErrors.firstName}</div>
								</div>
								<div className={css.field}>
									<label htmlFor="authLastName">Nazwisko</label>
									<input
										id="authLastName"
										name="lastName"
										type="text"
										className={`${css.input}${fieldErrors.lastName ? ' ' + css.inputError : ''}`}
										placeholder="Twoje nazwisko"
										value={form.lastName}
										onChange={this.handleChange}
										disabled={loading}
										autoComplete="family-name"
									/>
									<div className={css.errorMsg}>{fieldErrors.lastName}</div>
								</div>
							</div>
						)}

						<div className={css.field}>
							<label htmlFor="authEmail">Adres e-mail</label>
							<input
								id="authEmail"
								name="email"
								type="email"
								className={`${css.input}${fieldErrors.email ? ' ' + css.inputError : ''}`}
								placeholder="email@example.com"
								value={form.email}
								onChange={this.handleChange}
								disabled={loading}
								autoComplete="email"
							/>
							<div className={css.errorMsg}>{fieldErrors.email}</div>
						</div>

						<div className={css.field}>
							<label htmlFor="authPassword">Hasło</label>
							<input
								id="authPassword"
								name="password"
								type="password"
								className={`${css.input}${fieldErrors.password ? ' ' + css.inputError : ''}`}
								placeholder={mode === MODE_REGISTER ? 'Min. 8 znaków' : '••••••••'}
								value={form.password}
								onChange={this.handleChange}
								disabled={loading}
								autoComplete={mode === MODE_REGISTER ? 'new-password' : 'current-password'}
							/>
							<div className={css.errorMsg}>{fieldErrors.password}</div>
						</div>

						{mode === MODE_REGISTER && (
							<div className={css.field}>
								<label htmlFor="authConfirmPassword">Powtórz hasło</label>
								<input
									id="authConfirmPassword"
									name="confirmPassword"
									type="password"
									className={`${css.input}${fieldErrors.confirmPassword ? ' ' + css.inputError : ''}`}
									placeholder="••••••••"
									value={form.confirmPassword}
									onChange={this.handleChange}
									disabled={loading}
									autoComplete="new-password"
								/>
								<div className={css.errorMsg}>{fieldErrors.confirmPassword}</div>
							</div>
						)}

						<button type="submit" className={css.submitBtn} disabled={loading}>
							{loading && <span className={css.spinner} />}
							{mode === MODE_REGISTER ? 'Załóż konto' : 'Zaloguj się'}
						</button>
					</form>

					<div className={css.switchLine}>
						{mode === MODE_LOGIN ? (
							<>
								Nie masz konta?{' '}
								<button type="button" className={css.switchLink} onClick={() => this.switchMode(MODE_REGISTER)}>
									Zarejestruj się
								</button>
							</>
						) : (
							<>
								Masz już konto?{' '}
								<button type="button" className={css.switchLink} onClick={() => this.switchMode(MODE_LOGIN)}>
									Zaloguj się
								</button>
							</>
						)}
					</div>
				</div>
			</div>
		)
	}
}

export default AuthModal
