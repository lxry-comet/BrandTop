import React, { Component } from 'react'
import { Link } from 'react-router-dom'

//? imports styles
import css from './BrandStrip.module.css'


//? imports components


export class BrandStrip extends Component {
	render() {
		//! [1] Блок диструктуризації props та state

		//! [2] Блок обчислювальних дaних

		const brandStripName = ['Adidas', 'Nike', 'Ground Game', 'Pit Bull', 'Air Jordan', 'MKS Flota Swinoujscie', 'New Balance']

		//! [3] Блок консолей необхідних даних

		return (
			<>
				<div className={css.brandstrip}>
					<div className={css.brandstrip__track}>
						{/* Duplikujemy listę 4x (nie 2x) — przy 2x na bardzo szerokich
						ekranach jedna kopia bywa węższa niż viewport, przez co tuż
						przed zapętleniem widać pustą przestrzeń zanim animacja
						"skoczy" z powrotem na start. 4 kopie dają zapas treści,
						a translateX w CSS jest przeliczony tak, żeby prędkość
						przewijania zostawała identyczna. */}
						{[...brandStripName, ...brandStripName, ...brandStripName, ...brandStripName].map((name, index) => (
							<React.Fragment key={`${name}-${index}`}>
								<Link
									to={`/catalog?type=obuwie&brand=${encodeURIComponent(name)}`}
									className={css.brandstrip__name}
								>
									{name}
								</Link>
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