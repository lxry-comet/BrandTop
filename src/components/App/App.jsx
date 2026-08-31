// TODO 1 week: Cerate 4 components:
// *              Header
// *         			BrandStrip
// *              Hero
// *	            Colections
// * 	            Bestsellers
// * 			 			  New
// ? 	 					 	Contacts
// *              Footer
import React, { Component } from 'react'

//? imports styles
import css from './App.module.css'

//? imports components
import {Header} from '@/components/Header/Header.jsx';
import {BrandStrip} from '@/components/BrandStrip/BrandStrip.jsx';
import {Hero} from '@/components/Hero/Hero.jsx'
import {Footer} from '@/components/Footer/Footer.jsx'
import {Collections} from '@/components/Collections/Collections.jsx'
import {Bestsellers} from '@/components/Bestsellers/Bestsellers.jsx'
import {Newproducts} from '@/components/Newproducts/Newproducts.jsx'
import {Contacts} from '@/components/Contacts/Contacts.jsx'
import {Catalog} from '@/components/Checkout/Catalog/Catalog.jsx'
import CheckoutSuccess from '@/components/CheckoutSuccess/CheckoutSuccess.jsx'
import { Route, Routes, useLocation } from 'react-router-dom'
import {Wideo} from '@/components/Wideo/Wideo.jsx'
import CartWithNavigate from '@/components/Cart/CartWithNavigate.jsx'
import {Favorites} from '@/components/Favorites/Favorites.jsx'
import {AuthModal} from '@/components/AuthModal/AuthModal.jsx'
import {Account} from '@/components/Account/Account.jsx'
import {ProductPageRoute} from '@/components/ProductPage/ProductPage.jsx'
import {Admin} from '@/components/Admin/Admin.jsx'
import { supabase } from '@/lib/supabaseClient'
import CheckoutWithNavigate from '@/components/Checkout/CheckoutWithNavigate.jsx'

function HomePage() {
	return (
		<>
			<Hero/>
			{/* <Bestsellers/> */}
			{/* <Newproducts/> */}
		</>
	)
}

// Вынесено в функциональный компонент, чтобы можно было
// использовать useLocation() и пересоздавать Catalog при смене ?type=
function AppRoutes({ user, authLoading }) {
	const location = useLocation()

	return (
		<Routes>
			<Route path='/' element={<HomePage/>}/>
			{/* <Route path='/hero' element={<Hero/>}/> */}
			{/* <Route path='/collections' element={<Collections/>}/> */}
			<Route path='/catalog' element={<Catalog key={location.search} />}/>
			<Route path='/product/:id' element={<ProductPageRoute/>}/>
			<Route path='/account' element={<Account/>}/>
			{/* <Route path='/bestsellers' element={<Bestsellers/>}/> */}
			{/* <Route path='/newproducts' element={<Newproducts/>}/> */}
			<Route path='/wideo' element={<Wideo/>}/>
			<Route path='/cart' element={<CartWithNavigate/>}/>
			<Route path='/checkout' element={<CheckoutWithNavigate/>}/>
			<Route path='/checkout/sukces' element={<CheckoutSuccess/>}/>
			<Route path='/favorites' element={<Favorites/>}/>
			<Route path='/contact' element={<Contacts/>}/>
			<Route path='/admin' element={<Admin user={user} authLoading={authLoading}/>}/>
		</Routes>
	)
}

export class App extends Component {
	state = {
		authOpen: false,
		user: null,
		// Dopóki true — sesja jeszcze się ładuje z Supabase (getUser jest async).
		// Bez tego flagi trasa /admin mogłaby przedwcześnie zdecydować "brak dostępu"
		// i przekierować, zanim zdążymy w ogóle sprawdzić prawdziwą sesję/rolę.
		authLoading: true
	}
	authSubscription = null

	componentDidMount() {
		// WAŻNE: getUser() (nie getSession()) — getSession() tylko odczytuje token
		// zapisany lokalnie w przeglądarce i NIE sprawdza z serwerem, czy ten
		// użytkownik nadal istnieje. Jeśli konto zostało usunięte ręcznie w Supabase
		// (Authentication → Users), stary token w localStorage nadal "wygląda"
		// na ważny, więc Header pokazywałby link do /account, a dopiero tam
		// dochodziłoby do realnego sprawdzenia i przekierowania z powrotem —
		// czyli efekt, który wyglądał jak "strona się przeładowuje".
		// getUser() pyta serwer od razu, więc możemy tu wykryć nieważną sesję
		// i ją wyczyścić, zanim cokolwiek zdąży się wyrenderować.
		supabase.auth.getUser().then(({ data, error }) => {
			if (error) {
				// Token wskazuje na użytkownika, który już nie istnieje (usunięty
				// ręcznie w Supabase) albo sesja wygasła — czyścimy ją, żeby Header
				// i inne komponenty nie myślały błędnie, że ktoś jest zalogowany.
				supabase.auth.signOut()
				this.loadUserWithRole(null)
			} else {
				this.loadUserWithRole(data.user)
			}
		})

		// Trzyma state.user w synchronizacji przy logowaniu, wylogowaniu (także z Account.jsx)
		// i odświeżeniu tokenu — jedno źródło prawdy zamiast ręcznego ustawiania w kilku miejscach.
		const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
			this.loadUserWithRole(session?.user ?? null)
		})
		this.authSubscription = listener.subscription
	}

	componentWillUnmount() {
		this.authSubscription?.unsubscribe()
	}

	// Dociąga role z profiles i dopiero wtedy zapisuje usera w state — dzięki temu
	// Header i Admin mają dostęp do user.role od razu, bez dodatkowego zapytania
	// w każdym komponencie z osobna. Ustawianie roli tutaj jest tylko wygodą UI:
	// prawdziwe zabezpieczenie zapisu do bazy pilnuje RLS po stronie Supabase,
	// więc nawet gdyby ktoś podmienił user.role w devtools, i tak nic nie zapisze.
	loadUserWithRole = async (sessionUser) => {
		if (!sessionUser) {
			this.setState({ user: null, authLoading: false })
			return
		}

		// WAŻNE: maybeSingle() (nie single()) — single() rzuca błąd PGRST116
		// ("Cannot coerce the result to a single JSON object"), gdy w profiles
		// nie ma jeszcze wiersza dla tego usera (np. świeżo utworzone konto,
		// albo dane profilu zostały ręcznie usunięte w Supabase). maybeSingle()
		// w takiej sytuacji po prostu zwraca null zamiast rzucać błąd.
		const { data, error } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', sessionUser.id)
			.maybeSingle()

		if (error) {
			console.error('Nie udało się pobrać roli użytkownika:', error)
		}

		this.setState({
			user: { ...sessionUser, role: data?.role ?? 'customer' },
			authLoading: false
		})
	}

	openAuth = () => this.setState({ authOpen: true })
  closeAuth = () => this.setState({ authOpen: false })
  handleAuthSuccess = (user) => {
		this.setState({ authOpen: false })
		this.loadUserWithRole(user)
	}
	render() {
		return (
			<>
				<Header onAccountClick={this.openAuth} user={this.state.user}/>
				<BrandStrip/>
				<AppRoutes user={this.state.user} authLoading={this.state.authLoading}/>
				<Footer/>
				<AuthModal
          isOpen={this.state.authOpen}
          onClose={this.closeAuth}
          onAuthSuccess={this.handleAuthSuccess}
          />
			</>
		)
	}
}
export default App;
