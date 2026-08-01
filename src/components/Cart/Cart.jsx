import React, { Component } from 'react'
import { Link } from 'react-router-dom'

import css from './Cart.module.css'

export class Cart extends Component {
	state = {
		selectedProducts: []
		// przykładowa struktura elementu:
		// { id, name, brand, img, price, qty, size, sizes: [40,41,42] }
	}

	getTotal = () => {
		const { selectedProducts } = this.state
		return selectedProducts.reduce(
			(sum, item) => sum + item.price * (item.qty || 1),
			0
		)
	}

	handleChangeQty = (index, delta) => {
		this.setState((prev) => {
			const updated = [...prev.selectedProducts]
			const currentQty = updated[index].qty || 1
			const nextQty = currentQty + delta

			if (nextQty < 1) return prev

			updated[index] = { ...updated[index], qty: nextQty }
			return { selectedProducts: updated }
		})
	}

	handleChangeSize = (index, newSize) => {
		this.setState((prev) => {
			const updated = [...prev.selectedProducts]
			updated[index] = { ...updated[index], size: newSize }
			return { selectedProducts: updated }
		})
	}

	handleRemove = (index) => {
		this.setState((prev) => ({
			selectedProducts: prev.selectedProducts.filter((_, i) => i !== index)
		}))
	}

	handleCompleteOrder = () => {
		// TODO: podłączyć zapis zamówienia do Supabase
		this.setState({ selectedProducts: [] })
	}

	render() {
		const { selectedProducts } = this.state
		const isEmpty = selectedProducts.length === 0

		return (
			<div className={css.content}>
				<div className={css.page_header}>
					<Link to="/" className={css.back_btn}>
						← Strona główna
					</Link>
					<h2 className={css.section_title}>Koszyk</h2>
					<div className={css.header_placeholder}></div>
				</div>

				{isEmpty ? (
					<p className={css.empty_text}>Koszyk jest pusty</p>
				) : (
					<>
						{selectedProducts.map((item, index) => {
							const lineTotal = item.price * (item.qty || 1)

							return (
								<div className={css.cart_row} key={item.id ?? index}>
									<img
										src={item.img}
										alt={item.name}
										onError={(e) => {
											e.target.src = `https://placehold.co/60x60/1a1a1a/fff?text=${encodeURIComponent(
												item.brand ?? ''
											)}`
										}}
									/>
									<div className={css.cart_itemDetails}>
										<div className={css.cart_itemName}>{item.name}</div>
										<div className={css.cart_itemMeta}>
											{item.brand} · Rozmiar:
											<select
												value={item.size}
												onChange={(e) =>
													this.handleChangeSize(index, e.target.value)
												}
											>
												{(item.sizes || []).map((size) => (
													<option key={size} value={size}>
														{size}
													</option>
												))}
											</select>
											<span className={css.qty_control}>
												<button onClick={() => this.handleChangeQty(index, -1)}>
													−
												</button>
												<span>{item.qty || 1}</span>
												<button onClick={() => this.handleChangeQty(index, 1)}>
													+
												</button>
											</span>
										</div>
									</div>
									<div className={css.cart_itemPrice}>{lineTotal} zł</div>
									<button
										className={css.rm_btn}
										onClick={() => this.handleRemove(index)}
									>
										✕
									</button>
								</div>
							)
						})}

						<div className={css.cart_total}>Razem: {this.getTotal()} zł</div>
						<button className={css.btn_buy} onClick={this.handleCompleteOrder}>
							Kup teraz
						</button>
					</>
				)}
			</div>
		)
	}
}

export default Cart
