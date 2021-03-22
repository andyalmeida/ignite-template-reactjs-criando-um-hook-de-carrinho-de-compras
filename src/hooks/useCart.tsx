import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId);
      let cartList: Product[] = [];

      const { amount } = (await api.get(`/stock/${productId}`)).data;

      if (product) {
        if (product.amount + 1 > amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        cartList = cart.map(product => {
          if (product.id === productId) {
            product.amount += 1;
          };
          return product;
        });
      } else {
        if (amount <= 0) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const { data } = await api.get(`/products/${productId}`);
        cartList = [
          ...cart,
          {
            ...data,
            amount: 1
          }
        ];
      }

      setCart(cartList);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartList));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId);
      if (!product) throw new Error();

      const cartList = cart.filter(product => product.id !== productId);

      setCart(cartList);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartList));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      let cartList: Product[] = [];
      const { amount: stock } = (await api.get(`/stock/${productId}`)).data;

      if (amount > stock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      cartList = cart.map(product => {
        if (product.id === productId) {
          product.amount = amount;
        };
        return product;
      });

      setCart(cartList);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartList));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
