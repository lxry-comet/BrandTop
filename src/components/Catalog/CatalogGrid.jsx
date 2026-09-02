import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import css from '../Products/Products.module.css'

const PLACEHOLDER_IMG = 'https://placehold.co/400x400?text=Brand-Top'

function getProductImage(product) {
	if (product.img) return product.img // якщо image_url вже заповнений — пріоритет йому
	if (!product.sku) return PLACEHOLDER_IMG
	return `${import.meta.env.BASE_URL}image/${product.sku}.jpg`
}

const HEART_PATH =
	'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09' +
	'C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'

export default function CatalogGrid({ products }) {
	const navigate = useNavigate()
	const [userId, setUserId] = useState(null)
	// Set z id produktów, które są ulubione — szybkie sprawdzanie has() przy renderze każdej karty.
	const [favoriteIds, setFavoriteIds] = useState(new Set())

	// Jednorazowo przy montowaniu: sprawdź kto jest zalogowany i wczytaj jego
	// ulubione, żeby serca od razu pokazały właściwy stan (wypełnione/puste).
	useEffect(() => {
		let active = true

		supabase.auth.getUser().then(({ data: { user } }) => {
			if (!active) return
			setUserId(user?.id ?? null)
			if (!user) return

			supabase
				.from('favorites')
				.select('product_id')
				.eq('user_id', user.id)
				.then(({ data, error }) => {
					if (!active) return
					if (error) {
						console.error('Błąd pobierania ulubionych:', error)
						return
					}
					setFavoriteIds(new Set((data || []).map((f) => f.product_id)))
				})
		})

		return () => {
			active = false
		}
	}, [])

	const handleCardClick = (product) => {
		navigate(`/product/${product.id}`)
	}

	// stopPropagation — żeby klik w serce nie odpalił też handleCardClick
	// i nie przenosił na stronę produktu.
	const handleToggleFavorite = async (e, product) => {
		e.stopPropagation()

		if (!userId) {
			alert('Zaloguj się, aby dodać produkt do ulubionych.')
			return
		}

		const isFav = favoriteIds.has(product.id)

		// Optymistyczna zmiana — serce reaguje natychmiast, a w razie błędu
		// z Supabase wracamy do poprzedniego stanu (ten sam wzorzec co w Cart.jsx).
		setFavoriteIds((prev) => {
			const next = new Set(prev)
			if (isFav) next.delete(product.id)
			else next.add(product.id)
			return next
		})

		const { error } = isFav
			? await supabase.from('favorites').delete().eq('user_id', userId).eq('product_id', product.id)
			: await supabase.from('favorites').insert({ user_id: userId, product_id: product.id })

		if (error) {
			console.error('Błąd zapisu ulubionych:', error)
			setFavoriteIds((prev) => {
				const next = new Set(prev)
				if (isFav) next.add(product.id)
				else next.delete(product.id)
				return next
			})
		}
	}

	return (
		<div className={css.products__list}>
			{products.map((product, index) => {
				const imgSrc = getProductImage(product)
				const isFav = favoriteIds.has(product.id)

				return (
					<div
						className={css.products__itemcard}
						key={product.id ?? index}
						onClick={() => handleCardClick(product)}
						role="button"
						tabIndex={0}
						onKeyDown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault()
								handleCardClick(product)
							}
						}}
					>
						<div className={css.products__itemwrap}>
							<div className={css.products__imgwrap}>
								<img
									src={imgSrc}
									alt={product.name}
									loading="lazy"
									onError={(e) => {
										e.currentTarget.src = PLACEHOLDER_IMG
									}}
								/>
								<span
									className={`${css.favIcon} ${isFav ? css.liked : ''}`}
									onClick={(e) => handleToggleFavorite(e, product)}
									role="button"
									aria-label={isFav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
								>
									<svg className={css.heartSvg} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
										<path d={HEART_PATH} />
									</svg>
								</span>
							</div>
							<div className={css.products__body}>
								{product.discount && (
									<span className={css.products__sale}>{product.discount}</span>
								)}
								<span className={css.products__name}>{product.name}</span>
								<span className={css.products__sub}></span>
								<div className={css.products__price}>
									{product.oldPrice && (
										<span className={css.old__price}>{product.oldPrice} zł</span>
									)}
									<span className={css.sale__price}>
										{product.price != null ? `${product.price} zł` : 'Cena wkrótce'}
									</span>
								</div>
							</div>
						</div>
					</div>
				)
			})}
		</div>
	)
}