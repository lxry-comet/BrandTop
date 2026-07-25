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
import { Route, Routes } from 'react-router-dom'

function HomePage() {
	return (
		<>
			<Hero/>
			<Bestsellers/>
			<Newproducts/>
		</>
	)
}

export class App extends Component {
	
	render() {
		return (
			<>
				<Header/>
				<BrandStrip/>
				<Routes>
					<Route path='/' element={<HomePage/>}/>
					<Route path='/hero' element={<Hero/>}/>
					<Route path='/collections' element={<Collections/>}/>
					<Route path='/bestsellers' element={<Bestsellers/>}/>
					<Route path='/newproducts' element={<Newproducts/>}/>
					<Route path='/contact' element={<Contacts/>}/>
				</Routes>
				<Footer/>
			</>
		)
	}
}
export default App;
