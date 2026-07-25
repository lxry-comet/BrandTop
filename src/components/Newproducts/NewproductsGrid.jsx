import Reacct from 'react';
import css from '../Products/Products.module.css'

export default function NewproductsGrid({ products }){
	return(
							<div className={css.products__list}>
						{products.map((product, index) => {
							return (
								<div className={css.products__itemcard} key={product.id ?? index}>
									<div className={css.products__itemwrap}>
										<div className={css.products__imgwrap}>
											<img src={product.img} alt={product.name} />
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
												<span className={css.sale__price}>{product.price} zł</span>
											</div>
										</div>
									</div>
								</div>
							)
						})}
					</div>
	)
}