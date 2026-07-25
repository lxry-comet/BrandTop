import React, { Component } from 'react'

//? imports styles
import css from './BrandStrip.module.css'


//? imports components


export class BrandStrip extends Component {
	render() {
		//! [1] Блок диструктуризації props та state

		//! [2] Блок обчислювальних дaних

		const brandStripName = ['Adidas', 'Nike', 'Vans', 'PitBull', 'Puma', 'Reebook', 'Jordan', 'Asics', 'Salomon', 'Converse', 'New Balance']

		//! [3] Блок консолей необхідних даних

		return (
			<>
				<div className={css.brandstrip}>
					<div className={css.brandstrip__track}>
						{/* Duplikujemy listę 2x, żeby animacja mogła płynnie się zapętlić */}
						{[...brandStripName, ...brandStripName].map((name, index) => (
							<React.Fragment key={`${name}-${index}`}>
								<div className={css.brandstrip__name}>{name}</div>
								<div className={css.brandstrip__sep}>●</div>
							</React.Fragment>
						))}
					</div>
				</div>
			</>
		)
	}
}
export default BrandStrip
