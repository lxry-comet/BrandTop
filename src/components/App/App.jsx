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
import {Catalog} from '@/components/Catalog/Catalog.jsx'
import { Route, Routes, useLocation } from 'react-router-dom'
import {Wideo} from '@/components/Wideo/Wideo.jsx'
import {Cart} from '@/components/Cart/Cart.jsx'
import {Favorites} from '@/components/Favorites/Favorites.jsx'
import {ProductPageRoute} from '@/components/ProductPage/ProductPage.jsx'

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
function AppRoutes() {
	const location = useLocation()

	return (
		<Routes>
			<Route path='/' element={<HomePage/>}/>
			{/* <Route path='/hero' element={<Hero/>}/> */}
			{/* <Route path='/collections' element={<Collections/>}/> */}
			<Route path='/catalog' element={<Catalog key={location.search} />}/>
			<Route path='/product/:id' element={<ProductPageRoute/>}/>
			{/* <Route path='/bestsellers' element={<Bestsellers/>}/> */}
			{/* <Route path='/newproducts' element={<Newproducts/>}/> */}
			<Route path='/wideo' element={<Wideo/>}/>
			<Route path='/cart' element={<Cart/>}/>
			<Route path='/favorites' element={<Favorites/>}/>
			<Route path='/contact' element={<Contacts/>}/>
		</Routes>
	)
}

export class App extends Component {

	render() {
		return (
			<>
				<Header/>
				<BrandStrip/>
				<AppRoutes/>
				<Footer/>
			</>
		)
	}
}
export default App;