import React, { Component } from 'react'

//? imports styles
import css from './Hero.module.css'


//? imports components
import {Products} from '@/components/Products/Products.jsx'


export class Hero extends Component {
	render() {

		return (
			<>
				<section className={css.hero} id='hero'>
					<div className='container'>
						<div className={css.hero__bannerwrap}>
							<a className={css.hero__bannerlink} onclick="goToSaleCatalog()" title="Zniżki do 40%">
                <img src="https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=1300&amp;h=400&amp;fit=crop" alt="Zniżki do 40%" onerror="this.style.background='#333'; this.style.minHeight='250px';"/>
                    <div className={css.hero__bannertext}>Zniżki do 40%</div>
                </a>
						</div>
						<Products/>
					</div>
				</section>
			</>
		)
	}
}
export default Hero
