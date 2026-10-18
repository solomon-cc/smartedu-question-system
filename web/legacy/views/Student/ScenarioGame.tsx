import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';
import { api } from '../../services/api.ts';
import { 
  Gamepad2, 
  Store, 
  School, 
  Trees, 
  ChevronRight, 
  Play, 
  Settings,
  ShoppingBag,
  Coins,
  ArrowLeft
} from 'lucide-react';

interface Scenario {
  id: string;
  name: string;
  description: string;
  icon: string;
  image: string;
  type: string;
}

interface ScenarioItem {
  id: string;
  name: string;
  price: number;
  image: string;
}

const ScenarioGame: React.FC<{ language: 'zh' | 'en' }> = ({ language }) => {
  const auth = useContext(AuthContext);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [items, setItems] = useState<ScenarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<'list' | 'playing'>('list');
  const [cart, setCart] = useState<{item: ScenarioItem, count: number}[]>([]);
  const [money, setMoney] = useState(100);

  useEffect(() => {
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    try {
      const data = await api.scenarios.list();
      setScenarios(data);
    } catch (error) {
      console.error("Fetch scenarios error:", error);
    } finally {
      setLoading(false);
    }
  };

  const startScenario = async (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setLoading(true);
    try {
      const data = await api.scenarios.listItems(scenario.id);
      setItems(data);
      setGameState('playing');
      setCart([]);
      setMoney(100);
    } catch (error) {
      console.error("Fetch items error:", error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: ScenarioItem) => {
    if (money < item.price) return;
    setCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => i.item.id === item.id ? { ...i, count: i.count + 1 } : i);
      }
      return [...prev, { item, count: 1 }];
    });
    setMoney(prev => prev - item.price);
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'supermarket': return <Store className="w-12 h-12" />;
      case 'school': return <School className="w-12 h-12" />;
      case 'park': return <Trees className="w-12 h-12" />;
      default: return <Gamepad2 className="w-12 h-12" />;
    }
  };

  if (gameState === 'playing' && selectedScenario) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8 animate-in zoom-in-95 duration-500">
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => setGameState('list')}
            className="flex items-center gap-2 text-gray-500 font-black hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {language === 'zh' ? '返回列表' : 'Back'}
          </button>
          
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-2xl font-black shadow-inner">
                <Coins className="w-5 h-5" />
                <span>¥ {money.toFixed(2)}</span>
             </div>
             <div className="flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-2xl font-black shadow-inner">
                <ShoppingBag className="w-5 h-5" />
                <span>{cart.reduce((acc, i) => acc + i.count, 0)}</span>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] shadow-sm border dark:border-gray-700">
              <h2 className="text-2xl font-black dark:text-white mb-6 flex items-center gap-3">
                {getIcon(selectedScenario.type)}
                {selectedScenario.name}
              </h2>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {items.length === 0 ? (
                  <div className="col-span-full py-20 text-center text-gray-400 font-bold italic">
                    {language === 'zh' ? '老师还没有在这个场景放置物品哦' : 'No items in this scenario yet.'}
                  </div>
                ) : (
                  items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => addToCart(item)}
                      disabled={money < item.price}
                      className={`
                        group p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3
                        ${money < item.price 
                          ? 'bg-gray-50 border-transparent opacity-50 grayscale cursor-not-allowed' 
                          : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-primary-500 hover:shadow-xl active:scale-95'
                        }
                      `}
                    >
                      <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center overflow-hidden">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingBag className="w-8 h-8 text-gray-200" />
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-black dark:text-white">{item.name}</p>
                        <p className="text-xs font-bold text-primary-600">¥ {item.price.toFixed(2)}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-[2.5rem] shadow-sm border dark:border-gray-700 sticky top-8">
              <h3 className="text-xl font-black dark:text-white mb-4 flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-primary-500" />
                {language === 'zh' ? '购物车' : 'Cart'}
              </h3>
              
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {cart.length === 0 ? (
                  <p className="text-center py-8 text-gray-400 font-bold text-sm italic">
                    {language === 'zh' ? '空空如也' : 'Cart is empty'}
                  </p>
                ) : (
                  cart.map(c => (
                    <div key={c.item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shrink-0">
                            {c.item.image ? <img src={c.item.image} className="w-full h-full object-cover" /> : <ShoppingBag className="w-4 h-4 text-gray-300" />}
                          </div>
                          <div>
                            <p className="text-xs font-black dark:text-white">{c.item.name}</p>
                            <p className="text-[10px] font-bold text-gray-400">¥ {c.item.price.toFixed(2)} x {c.count}</p>
                          </div>
                       </div>
                       <p className="text-xs font-black text-primary-600">¥ {(c.item.price * c.count).toFixed(2)}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6 pt-6 border-t dark:border-gray-700 space-y-4">
                <div className="flex justify-between items-center text-lg font-black dark:text-white">
                  <span>{language === 'zh' ? '总计' : 'Total'}</span>
                  <span className="text-primary-600">¥ {cart.reduce((acc, i) => acc + (i.item.price * i.count), 0).toFixed(2)}</span>
                </div>
                <button 
                  disabled={cart.length === 0}
                  className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                >
                  {language === 'zh' ? '去结账' : 'Checkout'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-12">
        <div className="p-4 bg-purple-500 text-white rounded-3xl shadow-xl shadow-purple-100">
          <Gamepad2 className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-black dark:text-white">
            {language === 'zh' ? '应用板块' : 'Application'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-bold text-sm uppercase tracking-widest mt-1">
            {language === 'zh' ? '生活场景模拟与应用练习' : 'Scenario simulation and life skills'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center font-black text-gray-300 animate-pulse tracking-widest uppercase">
          {language === 'zh' ? '加载场景中...' : 'Loading Scenarios...'}
        </div>
      ) : scenarios.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-12 rounded-[3rem] text-center border dark:border-gray-700">
           <Store className="w-16 h-16 text-gray-100 mx-auto mb-6" />
           <p className="text-gray-400 font-black">{language === 'zh' ? '暂无场景' : 'No scenarios found.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {scenarios.map(s => (
            <button
              key={s.id}
              onClick={() => startScenario(s)}
              className="group relative overflow-hidden bg-white dark:bg-gray-800 p-8 rounded-[3rem] text-left border-2 border-transparent hover:border-purple-500 transition-all shadow-sm hover:shadow-2xl"
            >
              <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    {getIcon(s.type)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black dark:text-white mb-2">{s.name}</h3>
                    <p className="text-sm font-bold text-gray-400 leading-relaxed">
                      {s.description || (language === 'zh' ? '在这个场景中练习你的生活技能吧！' : 'Practice your life skills in this scenario!')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-purple-600 font-black text-sm group-hover:gap-4 transition-all">
                  {language === 'zh' ? '进入场景' : 'Enter Scenario'}
                  <Play className="w-4 h-4 fill-current" />
                </div>
              </div>
              
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                {getIcon(s.type)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScenarioGame;
