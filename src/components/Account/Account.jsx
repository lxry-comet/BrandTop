// src/components/Account/Account.jsx
//
// „Moje konto” — Profil / Adres / Zamówienia, spięte z Supabase (profiles,
// addresses, orders — patrz supabase_schema.sql). Ta sama konwencja co
// pozostałe komponenty: `export class X extends Component`, `state = {...}`,
// metody-strzałki jako class fields, CSS Modules, import przez `@/...`.
//
// Trasa: dodaj w App.jsx (AppRoutes) — <Route path='/account' element={<Account/>}/>
// Wejście: Header już przekazuje `user` do App.state, a Header.jsx linkuje
// „👤” na /account, gdy user jest zalogowany (patrz zaktualizowany Header.jsx).
//
// Jeśli ktoś wejdzie na /account bez sesji (np. wpisze URL ręcznie),
// komponent przekierowuje na stronę główną.

import { Component } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import css from './Account.module.css';

const GENDER_OPTIONS = [
	{ value: '', label: 'Wybierz...' },
	{ value: 'male', label: 'Mężczyzna' },
	{ value: 'female', label: 'Kobieta' },
	{ value: 'other', label: 'Inne' },
	{ value: 'none', label: 'Wolę nie podawać' }
];

const STATUS_LABELS = {
	pending: 'Oczekujące',
	paid: 'Opłacone',
	shipped: 'Wysłane',
	completed: 'Zrealizowane',
	cancelled: 'Anulowane'
};

const INITIAL_PROFILE = { firstName: '', lastName: '', phone: '', dateOfBirth: '', gender: '' };
const INITIAL_ADDRESS = { city: '', street: '', houseNumber: '', apartment: '', zipCode: '', notes: '' };

export class Account extends Component {
	state = {
		loading: true,
		user: null,
		signedOut: false,
		activeTab: 'profile',

		profile: { ...INITIAL_PROFILE },
		profileErrors: {},
		profileSaving: false,
		profileToast: '',

		addressId: null,
		address: { ...INITIAL_ADDRESS },
		addressErrors: {},
		addressSaving: false,
		addressToast: '',

		orders: [],
		ordersLoading: true
	}

	componentDidMount() {
		this.loadAccount()
	}

	async loadAccount() {
		const { data: { user } } = await supabase.auth.getUser()

		if (!user) {
			this.setState({ loading: false, user: null })
			return
		}

		this.setState({ user })

		const [{ data: profileRow }, { data: addressRow }] = await Promise.all([
			supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
			supabase.from('addresses').select('*').eq('user_id', user.id).eq('is_default', true).maybeSingle()
		])

		this.setState({
			loading: false,
			profile: profileRow ? {
				firstName: profileRow.first_name || '',
				lastName: profileRow.last_name || '',
				phone: profileRow.phone || '',
				dateOfBirth: profileRow.date_of_birth || '',
				gender: profileRow.gender || ''
			} : { ...INITIAL_PROFILE },
			addressId: addressRow?.id ?? null,
			address: addressRow ? {
				city: addressRow.city || '',
				street: addressRow.street || '',
				houseNumber: addressRow.house_number || '',
				apartment: addressRow.apartment || '',
				zipCode: addressRow.zip_code || '',
				notes: addressRow.notes || ''
			} : { ...INITIAL_ADDRESS }
		})

		this.loadOrders(user.id)
	}

	async loadOrders(userId) {
		const { data, error } = await supabase
			.from('orders')
			.select('*')
			.eq('user_id', userId)
			.order('created_at', { ascending: false })

		this.setState({ orders: error ? [] : data, ordersLoading: false })
	}

	setActiveTab = (tab) => this.setState({ activeTab: tab })

	handleProfileChange = (event) => {
		const { name, value } = event.target
		this.setState(prev => ({
			profile: { ...prev.profile, [name]: value },
			profileErrors: { ...prev.profileErrors, [name]: '' }
		}))
	}

	handleAddressChange = (event) => {
		const { name, value } = event.target
		this.setState(prev => ({
			address: { ...prev.address, [name]: value },
			addressErrors: { ...prev.addressErrors, [name]: '' }
		}))
	}

	saveProfile = async (event) => {
		event.preventDefault()
		const { profile, user } = this.state
		const errors = {}
		if (!profile.firstName.trim()) errors.firstName = 'Podaj imię.'
		if (!profile.lastName.trim()) errors.lastName = 'Podaj nazwisko.'
		if (Object.keys(errors).length) {
			this.setState({ profileErrors: errors })
			return
		}

		this.setState({ profileSaving: true, profileToast: '' })

		const { error } = await supabase.from('profiles').update({
			first_name: profile.firstName.trim(),
			last_name: profile.lastName.trim(),
			phone: profile.phone.trim() || null,
			date_of_birth: profile.dateOfBirth || null,
			gender: profile.gender || null
		}).eq('id', user.id)

		this.setState({
			profileSaving: false,
			profileToast: error ? 'Nie udało się zapisać zmian.' : 'Zapisano zmiany.'
		})
	}

	saveAddress = async (event) => {
		event.preventDefault()
		const { address, addressId, user } = this.state
		const errors = {}
		if (!address.city.trim()) errors.city = 'Podaj miasto.'
		if (!address.street.trim()) errors.street = 'Podaj ulicę.'
		if (!address.houseNumber.trim()) errors.houseNumber = 'Podaj numer domu.'
		if (!address.zipCode.trim()) errors.zipCode = 'Podaj kod pocztowy.'
		if (Object.keys(errors).length) {
			this.setState({ addressErrors: errors })
			return
		}

		this.setState({ addressSaving: true, addressToast: '' })

		const payload = {
			user_id: user.id,
			city: address.city.trim(),
			street: address.street.trim(),
			house_number: address.houseNumber.trim(),
			apartment: address.apartment.trim() || null,
			zip_code: address.zipCode.trim(),
			notes: address.notes.trim() || null,
			is_default: true
		}

		const query = addressId
			? supabase.from('addresses').update(payload).eq('id', addressId).select().single()
			: supabase.from('addresses').insert(payload).select().single()

		const { data, error } = await query

		this.setState({
			addressSaving: false,
			addressId: data?.id ?? addressId,
			addressToast: error ? 'Nie udało się zapisać adresu.' : 'Adres zapisany.'
		})
	}

	handleSignOut = async () => {
		await supabase.auth.signOut()
		this.setState({ signedOut: true })
	}

	render() {
		const { loading, user, signedOut } = this.state

		if (signedOut) return <Navigate to='/' replace />
		if (loading) return <div className={css.page}><p className={css.loadingText}>Ładowanie...</p></div>
		if (!user) return <Navigate to='/' replace />

		const {
			activeTab, profile, profileErrors, profileSaving, profileToast,
			address, addressErrors, addressSaving, addressToast,
			orders, ordersLoading
		} = this.state

		return (
			<div className={css.page}>
				<div className={css.pageHeader}>
					<Link to='/' className={css.backBtn}>← Strona główna</Link>
					<div className={css.title}>Moje konto</div>
					<button type='button' className={css.signOutBtn} onClick={this.handleSignOut}>Wyloguj</button>
				</div>

				<div className={css.tabs}>
					<button
						type='button'
						className={`${css.tab}${activeTab === 'profile' ? ' ' + css.tabActive : ''}`}
						onClick={() => this.setActiveTab('profile')}
					>
						Profil
					</button>
					<button
						type='button'
						className={`${css.tab}${activeTab === 'address' ? ' ' + css.tabActive : ''}`}
						onClick={() => this.setActiveTab('address')}
					>
						Adres
					</button>
					<button
						type='button'
						className={`${css.tab}${activeTab === 'orders' ? ' ' + css.tabActive : ''}`}
						onClick={() => this.setActiveTab('orders')}
					>
						Zamówienia
					</button>
				</div>

				{activeTab === 'profile' && (
					<div className={css.card}>
						<div className={css.cardTitle}>Dane osobowe</div>
						{profileToast && <div className={css.toast}>{profileToast}</div>}
						<form onSubmit={this.saveProfile} noValidate>
							<div className={css.row}>
								<div className={css.field}>
									<label>Imię</label>
									<input
										name='firstName'
										className={`${css.input}${profileErrors.firstName ? ' ' + css.inputError : ''}`}
										value={profile.firstName}
										onChange={this.handleProfileChange}
										placeholder='Twoje imię'
									/>
									<div className={css.errorMsg}>{profileErrors.firstName}</div>
								</div>
								<div className={css.field}>
									<label>Nazwisko</label>
									<input
										name='lastName'
										className={`${css.input}${profileErrors.lastName ? ' ' + css.inputError : ''}`}
										value={profile.lastName}
										onChange={this.handleProfileChange}
										placeholder='Twoje nazwisko'
									/>
									<div className={css.errorMsg}>{profileErrors.lastName}</div>
								</div>
							</div>
							<div className={css.row}>
								<div className={css.field}>
									<label>Telefon</label>
									<input
										name='phone'
										className={css.input}
										value={profile.phone}
										onChange={this.handleProfileChange}
										placeholder='+48 000 000 000'
									/>
								</div>
								<div className={css.field}>
									<label>Data urodzenia</label>
									<input
										type='date'
										name='dateOfBirth'
										className={css.input}
										value={profile.dateOfBirth}
										onChange={this.handleProfileChange}
									/>
								</div>
							</div>
							<div className={css.field}>
								<label>Płeć</label>
								<select name='gender' className={css.input} value={profile.gender} onChange={this.handleProfileChange}>
									{GENDER_OPTIONS.map(opt => (
										<option key={opt.value} value={opt.value}>{opt.label}</option>
									))}
								</select>
							</div>
							<div className={css.field}>
								<label>Adres e-mail</label>
								<input className={css.input} value={user.email || ''} disabled />
							</div>
							<button type='submit' className={css.saveBtn} disabled={profileSaving}>
								{profileSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
							</button>
						</form>
					</div>
				)}

				{activeTab === 'address' && (
					<div className={css.card}>
						<div className={css.cardTitle}>Adres dostawy</div>
						{addressToast && <div className={css.toast}>{addressToast}</div>}
						<form onSubmit={this.saveAddress} noValidate>
							<div className={css.row}>
								<div className={css.field}>
									<label>Miasto</label>
									<input
										name='city'
										className={`${css.input}${addressErrors.city ? ' ' + css.inputError : ''}`}
										value={address.city}
										onChange={this.handleAddressChange}
										placeholder='Np. Warszawa'
									/>
									<div className={css.errorMsg}>{addressErrors.city}</div>
								</div>
								<div className={css.field}>
									<label>Kod pocztowy</label>
									<input
										name='zipCode'
										className={`${css.input}${addressErrors.zipCode ? ' ' + css.inputError : ''}`}
										value={address.zipCode}
										onChange={this.handleAddressChange}
										placeholder='00-000'
									/>
									<div className={css.errorMsg}>{addressErrors.zipCode}</div>
								</div>
							</div>
							<div className={css.row}>
								<div className={css.field}>
									<label>Ulica</label>
									<input
										name='street'
										className={`${css.input}${addressErrors.street ? ' ' + css.inputError : ''}`}
										value={address.street}
										onChange={this.handleAddressChange}
										placeholder='Np. ul. Modowa'
									/>
									<div className={css.errorMsg}>{addressErrors.street}</div>
								</div>
								<div className={css.field}>
									<label>Numer domu</label>
									<input
										name='houseNumber'
										className={`${css.input}${addressErrors.houseNumber ? ' ' + css.inputError : ''}`}
										value={address.houseNumber}
										onChange={this.handleAddressChange}
										placeholder='Np. 42'
									/>
									<div className={css.errorMsg}>{addressErrors.houseNumber}</div>
								</div>
							</div>
							<div className={css.field}>
								<label>Mieszkanie / lokal (opcjonalnie)</label>
								<input name='apartment' className={css.input} value={address.apartment} onChange={this.handleAddressChange} />
							</div>
							<div className={css.field}>
								<label>Uwagi dla kuriera (opcjonalnie)</label>
								<input name='notes' className={css.input} value={address.notes} onChange={this.handleAddressChange} />
							</div>
							<button type='submit' className={css.saveBtn} disabled={addressSaving}>
								{addressSaving ? 'Zapisywanie...' : 'Zapisz adres'}
							</button>
						</form>
					</div>
				)}

				{activeTab === 'orders' && (
					<div className={css.card}>
						<div className={css.cardTitle}>Historia zamówień</div>
						{ordersLoading && <p className={css.loadingText}>Ładowanie...</p>}
						{!ordersLoading && orders.length === 0 && (
							<p className={css.emptyText}>Nie masz jeszcze żadnych zamówień.</p>
						)}
						{!ordersLoading && orders.map(order => (
							<div key={order.id} className={css.orderRow}>
								<div>
									<div className={css.orderId}>Zamówienie #{order.id}</div>
									<div className={css.orderDate}>{new Date(order.created_at).toLocaleDateString('pl-PL')}</div>
								</div>
								<div className={css.orderStatus}>{STATUS_LABELS[order.status] || order.status}</div>
								<div className={css.orderTotal}>{Number(order.total).toFixed(2)} zł</div>
							</div>
						))}
					</div>
				)}

				<button type='button' className={css.signOutBtnBottom} onClick={this.handleSignOut}>
					Wyloguj się
				</button>
			</div>
		)
	}
}

export default Account
