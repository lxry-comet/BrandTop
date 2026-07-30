import React, { Component } from 'react'
import css from '../Products/Products.module.css'

export default class ProductCard extends Component {
	state = {
		currentImg: 0,
		liked: false
	}

	getGallery = () => {
		const { product } = this.props
		return product.gallery && product.gallery.length ? product.gallery : [product.img]
	}

	handlePrev = (e) => {
		e.stopPropagation()
		const gallery = this.getGallery()
		this.setState(prev => ({
			currentImg: (prev.currentImg - 1 + gallery.length) % gallery.length
		}))
	}

	handleNext = (e) => {
		e.stopPropagation()
		const gallery = this.getGallery()
		this.setState(prev => ({
			currentImg: (prev.currentImg + 1) % gallery.length
		}))
	}

	handleDotClick = (index, e) => {
		e.stopPropagation()
		this.setState({ currentImg: index })
	}

	handleToggleFav = (e) => {
		e.stopPropagation()
		this.setState(prev => ({ liked: !prev.liked }))
	}

	render() {
		const { product } = this.props
		const { currentImg, liked } = this.state
		const gallery = this.getGallery()
		const hasMultiple = gallery.length > 1

		return (
			<div className={css.products__itemcard}>
				<div className={css.products__itemwrap}>
					<div className={css.products__imgwrap}>
						<img src={gallery[currentImg]} alt={product.name} />

						{hasMultiple && (
							<>
								<button
									className={`${css.imgNav} ${css.imgNavPrev}`}
									onClick={this.handlePrev}
									aria-label="Poprzednie zdjęcie"
								>
									‹
								</button>
								<button
									className={`${css.imgNav} ${css.imgNavNext}`}
									onClick={this.handleNext}
									aria-label="Następne zdjęcie"
								>
									›
								</button>
								<div className={css.imgDots}>
									{gallery.map((_, i) => (
										<button
											key={i}
											className={`${css.imgDot} ${i === currentImg ? css.imgDotActive : ''}`}
											onClick={(e) => this.handleDotClick(i, e)}
										/>
									))}
								</div>
							</>
						)}

						<span
							className={`${css.favIcon} ${liked ? css.liked : ''}`}
							onClick={this.handleToggleFav}
						>
							<svg className={css.heartSvg} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
								<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
							</svg>
						</span>
					</div>

					<div className={css.products__body}>
						{product.oldPrice ? (
							<span className={css.products__sale}>Promocja</span>
						) : (
							<span className={css.badgeBestseller}>Bestseller</span>
						)}
						<span className={css.products__name}>{product.name}</span>
						<span className={css.products__sub}></span>
						<div className={css.products__price}>
							{product.oldPrice && (
								<span className={css.old__price}>{product.oldPrice} zł</span>
							)}
							<span className={css.sale__price}>{product.price} zł</span>
						</div>
					</div>
				</div>
			</div>
		)
	}
}