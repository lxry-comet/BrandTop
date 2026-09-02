import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import css from './Products.module.css'
import ProductCard from './ProductCard.jsx'

export default function ProductGrid({ products }) {
	const [userId, setUserId] = useState(null)
	const [favoriteIds, setFavoriteIds] = useState(new Set())

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

	const handleToggleFavorite = async (product) => {
		if (!userId) {
			alert('Zaloguj się, aby dodać produkt do ulubionych.')
			return
		}

		const isFav = favoriteIds.has(product.id)

		// Optymistyczna zmiana — ten sam wzorzec co w CatalogGrid.jsx
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
			{products.map((product) => (
				<ProductCard
					product={product}
					key={product.id}
					isFavorite={favoriteIds.has(product.id)}
					onToggleFavorite={handleToggleFavorite}
				/>
			))}
		</div>
	)
}
